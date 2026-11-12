// Endereço do conector da Central para o Claude (MCP via HTTP).
// URL: https://<seu-site>/api/claude/<CLAUDE_CONECTOR_CHAVE>
// Precisa de duas variáveis na Vercel: CLAUDE_CONECTOR_CHAVE e SUPABASE_SERVICE_ROLE_KEY.

import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/supabase/config';
import { processar } from '@/lib/conector';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CHAVE = (process.env.CLAUDE_CONECTOR_CHAVE || '').trim();
const SERVICE = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const AUTOR = (process.env.CLAUDE_CONECTOR_NOME || 'Claude').trim();

function chaveOk(recebida) {
  if (CHAVE.length < 24) return false;
  const a = Buffer.from(String(recebida || ''));
  const b = Buffer.from(CHAVE);
  return a.length === b.length && timingSafeEqual(a, b);
}

function json(corpo, status = 200) {
  return new Response(corpo === null ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function checar(error) {
  if (error) throw new Error(error.message);
}

// Acesso ao banco usado pelo conector (chave de serviço: só roda no servidor)
function criarDb() {
  const sb = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  const CAMPOS = 'id, titulo, setor, grupo_id, status, prioridade, responsavel, prazo, descricao';
  let emails = null;

  return {
    async grupos() {
      const { data, error } = await sb.from('tarefa_grupos').select('id, setor, nome, cor, ordem').order('ordem').order('criado_em');
      checar(error);
      return data || [];
    },
    async equipe() {
      const { data, error } = await sb.from('equipe').select('user_id, nome').order('nome');
      checar(error);
      if (!emails) {
        emails = {};
        try {
          const { data: u } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
          (u?.users || []).forEach((x) => (emails[x.id] = x.email));
        } catch {
          // sem e-mails: a busca por nome continua funcionando
        }
      }
      return (data || []).map((p) => ({ ...p, email: emails[p.user_id] || null }));
    },
    async contarPorGrupo() {
      const { data, error } = await sb.from('tarefas').select('grupo_id').neq('status', 'Feito');
      checar(error);
      const c = {};
      (data || []).forEach((t) => (c[t.grupo_id] = (c[t.grupo_id] || 0) + 1));
      return c;
    },
    async listarTarefas(f) {
      let q = sb.from('tarefas').select(CAMPOS);
      if (f.setor) q = q.eq('setor', f.setor);
      if (f.abertas) q = q.neq('status', 'Feito');
      if (f.status) q = q.eq('status', f.status);
      if (f.responsavel) q = q.eq('responsavel', f.responsavel);
      if (f.busca) q = q.ilike('titulo', '%' + f.busca.replace(/[%_\\]/g, (m) => '\\' + m) + '%');
      if (f.prazoAte) q = q.lte('prazo', f.prazoAte);
      const { data, error } = await q.order('prazo', { ascending: true, nullsFirst: false }).order('criado_em').limit(f.limite || 60);
      checar(error);
      return data || [];
    },
    async tarefaPorId(id) {
      const { data, error } = await sb.from('tarefas').select(CAMPOS).eq('id', id).maybeSingle();
      checar(error);
      return data;
    },
    async titulosExistentes(setores) {
      if (!setores.length) return [];
      const { data, error } = await sb.from('tarefas').select('setor, titulo').in('setor', setores);
      checar(error);
      return data || [];
    },
    async criarGrupo(g) {
      const { data, error } = await sb.from('tarefa_grupos').insert(g).select('id, setor, nome, cor, ordem').single();
      checar(error);
      return data;
    },
    async inserirTarefas(linhas) {
      const { data, error } = await sb.from('tarefas').insert(linhas).select(CAMPOS);
      checar(error);
      return data || [];
    },
    async atualizarTarefa(id, dados) {
      const { error } = await sb.from('tarefas').update(dados).eq('id', id);
      checar(error);
    },
    async registrar(itens) {
      if (!itens.length) return;
      const { error } = await sb.from('tarefa_atividade').insert(itens.map((i) => ({ ...i, autor_nome: AUTOR })));
      checar(error);
    },
    async comentar(tarefaId, texto) {
      const { error } = await sb.from('tarefa_atualizacoes').insert({ tarefa_id: tarefaId, autor: null, autor_nome: AUTOR, texto });
      checar(error);
    },
  };
}

export async function POST(request, { params }) {
  if (!chaveOk(params.chave)) return json({ erro: 'Não encontrado' }, 404);
  if (!SERVICE) {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Falta a variável SUPABASE_SERVICE_ROLE_KEY na Vercel.' } }, 500);
  }

  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } }, 400);
  }

  const base = new URL(request.url).origin;
  const db = criarDb();

  if (Array.isArray(corpo)) {
    const respostas = (await Promise.all(corpo.map((m) => processar(m, db, base)))).filter(Boolean);
    return respostas.length ? json(respostas) : new Response(null, { status: 202 });
  }
  const r = await processar(corpo, db, base);
  return r ? json(r) : new Response(null, { status: 202 });
}

// Este conector não abre fluxo contínuo (SSE): responde só por POST.
export async function GET(request, { params }) {
  if (!chaveOk(params.chave)) return json({ erro: 'Não encontrado' }, 404);
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}

export async function DELETE(request, { params }) {
  if (!chaveOk(params.chave)) return json({ erro: 'Não encontrado' }, 404);
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}
