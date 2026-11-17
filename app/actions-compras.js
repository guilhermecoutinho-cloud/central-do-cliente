'use server';

// Compras do Financeiro: pipelines (CAUP geral, Ambição...), colunas de cada kanban e as compras.

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { COLUNAS_PADRAO, corValida } from '@/lib/compras';

async function exigirFinanceiro() {
  const perfil = await getPerfil();
  if (!perfil || !podeSetor(perfil, 'financeiro')) throw new Error('Você não tem acesso ao Financeiro.');
  return perfil;
}
const revalidar = () => revalidatePath('/financeiro/compras');
const texto = (v, max = 120) => String(v || '').trim().slice(0, max);
const falhou = (error) => {
  if (error) throw new Error(error.message);
};

const CAMPOS = 'id, titulo, descricao, quantidade, valor, fornecedor, evento_id, pipeline_id, etapa_id, responsavel, prazo, ordem, criado_por, criado_em, compra_comentarios(count)';
const comContagem = (c) => ({ ...c, comentarios: c.compra_comentarios?.[0]?.count || 0, compra_comentarios: undefined });

// ---------------------------------------------------------------- Pipelines

export async function criarPipeline({ nome, evento_id, colunasPadrao = true }) {
  await exigirFinanceiro();
  const n = texto(nome, 80);
  if (!n) throw new Error('Dê um nome ao pipeline.');
  const supabase = createClient();
  const { data: ultimo } = await supabase.from('compra_pipelines').select('ordem').order('ordem', { ascending: false }).limit(1);
  const { data: p, error } = await supabase
    .from('compra_pipelines')
    .insert({ nome: n, evento_id: evento_id || null, ordem: (ultimo?.[0]?.ordem ?? 0) + 1 })
    .select('id')
    .single();
  falhou(error);
  const colunas = colunasPadrao ? COLUNAS_PADRAO : [{ nome: 'A fazer', cor: 'gray' }, { nome: 'Finalizado', cor: 'green' }];
  const { error: e2 } = await supabase.from('compra_etapas').insert(colunas.map((c, i) => ({ pipeline_id: p.id, nome: c.nome, cor: c.cor, ordem: i + 1 })));
  falhou(e2);
  revalidar();
  return p.id;
}

export async function editarPipeline({ id, nome, evento_id }) {
  await exigirFinanceiro();
  const dados = {};
  if (nome !== undefined) {
    const n = texto(nome, 80);
    if (!n) throw new Error('O pipeline precisa de um nome.');
    dados.nome = n;
  }
  if (evento_id !== undefined) dados.evento_id = evento_id || null;
  const { error } = await createClient().from('compra_pipelines').update(dados).eq('id', id);
  falhou(error);
  revalidar();
}

export async function excluirPipeline({ id }) {
  await exigirFinanceiro();
  const supabase = createClient();
  const { count } = await supabase.from('compra_pipelines').select('id', { count: 'exact', head: true });
  if ((count ?? 0) <= 1) throw new Error('Precisa existir pelo menos um pipeline de compras.');
  // As compras e colunas do pipeline são apagadas junto (cascade).
  const { error } = await supabase.from('compra_pipelines').delete().eq('id', id);
  falhou(error);
  revalidar();
}

// ---------------------------------------------------------------- Colunas do kanban

export async function criarEtapa({ pipeline_id, nome, cor }) {
  await exigirFinanceiro();
  const n = texto(nome, 60);
  if (!n) throw new Error('Dê um nome à coluna.');
  const supabase = createClient();
  const { data: ultima } = await supabase.from('compra_etapas').select('ordem').eq('pipeline_id', pipeline_id).order('ordem', { ascending: false }).limit(1);
  const { data, error } = await supabase
    .from('compra_etapas')
    .insert({ pipeline_id, nome: n, cor: corValida(cor), ordem: (ultima?.[0]?.ordem ?? 0) + 1 })
    .select('id, pipeline_id, nome, cor, ordem')
    .single();
  falhou(error);
  revalidar();
  return data;
}

export async function editarEtapa({ id, nome, cor }) {
  await exigirFinanceiro();
  const dados = {};
  if (nome !== undefined) {
    const n = texto(nome, 60);
    if (!n) throw new Error('A coluna precisa de um nome.');
    dados.nome = n;
  }
  if (cor !== undefined) dados.cor = corValida(cor);
  const { error } = await createClient().from('compra_etapas').update(dados).eq('id', id);
  falhou(error);
  revalidar();
}

// Troca a coluna de lugar com a vizinha (direcao: -1 esquerda, 1 direita)
export async function moverEtapa({ id, direcao }) {
  await exigirFinanceiro();
  const supabase = createClient();
  const { data: et } = await supabase.from('compra_etapas').select('id, pipeline_id').eq('id', id).single();
  if (!et) throw new Error('Coluna não encontrada.');
  const { data: todas } = await supabase.from('compra_etapas').select('id, ordem').eq('pipeline_id', et.pipeline_id).order('ordem').order('nome');
  const lista = todas || [];
  const i = lista.findIndex((x) => x.id === id);
  const j = i + (direcao < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  // Regrava a ordem de todas (1, 2, 3...) para não sobrar empate
  for (let k = 0; k < lista.length; k++) {
    if (lista[k].ordem !== k + 1) {
      const { error } = await supabase.from('compra_etapas').update({ ordem: k + 1 }).eq('id', lista[k].id);
      falhou(error);
    }
  }
  revalidar();
}

export async function excluirEtapa({ id }) {
  await exigirFinanceiro();
  const supabase = createClient();
  const { data: et } = await supabase.from('compra_etapas').select('id, pipeline_id').eq('id', id).single();
  if (!et) throw new Error('Coluna não encontrada.');
  const { data: outras } = await supabase.from('compra_etapas').select('id').eq('pipeline_id', et.pipeline_id).neq('id', id).order('ordem').limit(1);
  if (!outras?.length) throw new Error('O quadro precisa de pelo menos uma coluna.');
  // As compras dessa coluna vão para a primeira coluna que sobrar
  const { error: e1 } = await supabase.from('compras').update({ etapa_id: outras[0].id }).eq('etapa_id', id);
  falhou(e1);
  const { error } = await supabase.from('compra_etapas').delete().eq('id', id);
  falhou(error);
  revalidar();
}

// ---------------------------------------------------------------- Compras

export async function criarCompra({ titulo, pipeline_id, etapa_id }) {
  const perfil = await exigirFinanceiro();
  const t = texto(titulo, 200);
  if (!t) throw new Error('Escreva o que precisa comprar.');
  const supabase = createClient();
  const { data: p } = await supabase.from('compra_pipelines').select('id, evento_id').eq('id', pipeline_id).single();
  if (!p) throw new Error('Pipeline não encontrado.');
  const { data, error } = await supabase
    .from('compras')
    .insert({ titulo: t, pipeline_id: p.id, etapa_id: etapa_id || null, evento_id: p.evento_id, criado_por: perfil.nome })
    .select(CAMPOS)
    .single();
  falhou(error);
  revalidar();
  return comContagem(data);
}

export async function atualizarCompra({ id, dados }) {
  await exigirFinanceiro();
  const supabase = createClient();
  const permitido = ['titulo', 'descricao', 'quantidade', 'valor', 'fornecedor', 'etapa_id', 'pipeline_id', 'responsavel', 'prazo'];
  const limpo = {};
  for (const k of permitido) {
    if (!(k in dados)) continue;
    let v = dados[k];
    if (typeof v === 'string') v = v.trim();
    if (v === '') v = null;
    if (k === 'valor' && v !== null) {
      v = Number(String(v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
      if (!Number.isFinite(v)) v = null;
    }
    if (k === 'titulo' && !v) continue;
    if (k === 'pipeline_id' && !v) continue;
    limpo[k] = v;
  }
  // Mudou de pipeline: vai para a primeira coluna do novo e herda o evento dele
  if (limpo.pipeline_id) {
    const { data: p } = await supabase.from('compra_pipelines').select('id, evento_id').eq('id', limpo.pipeline_id).single();
    if (!p) throw new Error('Pipeline não encontrado.');
    const { data: primeira } = await supabase.from('compra_etapas').select('id').eq('pipeline_id', p.id).order('ordem').limit(1);
    limpo.etapa_id = primeira?.[0]?.id || null;
    limpo.evento_id = p.evento_id;
  }
  limpo.atualizado_em = new Date().toISOString();
  const { error } = await supabase.from('compras').update(limpo).eq('id', id);
  falhou(error);
  revalidar();
  return { etapa_id: limpo.etapa_id };
}

export async function excluirCompra({ id }) {
  await exigirFinanceiro();
  const { error } = await createClient().from('compras').delete().eq('id', id);
  falhou(error);
  revalidar();
}

export async function listarComentarios({ compra_id }) {
  await exigirFinanceiro();
  const { data, error } = await createClient().from('compra_comentarios').select('*').eq('compra_id', compra_id).order('criado_em');
  falhou(error);
  return data || [];
}

export async function comentarCompra({ compra_id, texto: t0 }) {
  const perfil = await exigirFinanceiro();
  const t = texto(t0, 3000);
  if (!t) throw new Error('Escreva o comentário.');
  const { data, error } = await createClient().from('compra_comentarios').insert({ compra_id, texto: t, autor_nome: perfil.nome }).select('*').single();
  falhou(error);
  revalidar();
  return data;
}
