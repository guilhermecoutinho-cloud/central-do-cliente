'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPerfil } from '@/lib/perfil';
import { SLUGS } from '@/lib/setores';
import { CORES_GRUPO, NOMES_PRIORIDADE, NOMES_STATUS } from '@/lib/tarefas';

function checar(error) {
  if (error) throw new Error(error.message);
}

function limpar(t, max = 500) {
  const v = String(t ?? '').trim();
  return v ? v.slice(0, max) : null;
}

function revalidarSetor(setor, tarefaId) {
  revalidatePath(`/setor/${setor}`);
  revalidatePath(`/setor/${setor}/painel`);
  revalidatePath('/minhas-tarefas');
  revalidatePath('/');
  if (tarefaId) revalidatePath(`/tarefas/${tarefaId}`);
}

async function registrar(supabase, tarefaId, texto) {
  const perfil = await getPerfil();
  await supabase.from('tarefa_atividade').insert({ tarefa_id: tarefaId, autor_nome: perfil?.nome || 'Alguém', texto });
}

// ---------------------------------------------------------------- Grupos

export async function criarGrupo({ setor, nome, cor }) {
  if (!SLUGS.includes(setor)) throw new Error('Setor inválido.');
  const n = limpar(nome, 80);
  if (!n) throw new Error('Dê um nome ao grupo.');
  const supabase = createClient();
  const { data: ult } = await supabase.from('tarefa_grupos').select('ordem').eq('setor', setor).order('ordem', { ascending: false }).limit(1);
  const ordem = ult && ult.length ? ult[0].ordem + 1 : 1;
  const { error } = await supabase.from('tarefa_grupos').insert({ setor, nome: n, cor: CORES_GRUPO[cor] ? cor : 'green', ordem });
  checar(error);
  revalidarSetor(setor);
}

export async function renomearGrupo({ id, setor, nome }) {
  const n = limpar(nome, 80);
  if (!n) throw new Error('Dê um nome ao grupo.');
  const supabase = createClient();
  const { error } = await supabase.from('tarefa_grupos').update({ nome: n }).eq('id', id);
  checar(error);
  revalidarSetor(setor);
}

export async function excluirGrupo({ id, setor }) {
  const supabase = createClient();
  const { error } = await supabase.from('tarefa_grupos').delete().eq('id', id);
  checar(error);
  revalidarSetor(setor);
}

// ---------------------------------------------------------------- Tarefas

export async function criarTarefa({ setor, grupo_id, titulo, responsavel, prazo }) {
  if (!SLUGS.includes(setor)) throw new Error('Setor inválido.');
  const t = limpar(titulo, 300);
  if (!t) throw new Error('Escreva o nome da tarefa.');
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tarefas')
    .insert({ setor, grupo_id: grupo_id || null, titulo: t, responsavel: responsavel || null, prazo: prazo || null })
    .select('id')
    .single();
  checar(error);
  await registrar(supabase, data.id, 'criou a tarefa');
  revalidarSetor(setor);
  return data.id;
}

const CAMPOS = {
  titulo: (v) => limpar(v, 300),
  descricao: (v) => limpar(v, 10000),
  status: (v) => (NOMES_STATUS.includes(v) ? v : undefined),
  prioridade: (v) => (NOMES_PRIORIDADE.includes(v) ? v : undefined),
  responsavel: (v) => v || null,
  prazo: (v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null),
  grupo_id: (v) => v || null,
};

export async function atualizarTarefa({ id, setor, campo, valor, rotulo }) {
  const conv = CAMPOS[campo];
  if (!conv) throw new Error('Campo inválido.');
  const v = conv(valor);
  if (v === undefined) throw new Error('Valor inválido.');
  if (campo === 'titulo' && !v) throw new Error('A tarefa precisa de um nome.');

  const dados = { [campo]: v, atualizado_em: new Date().toISOString() };
  if (campo === 'status') dados.concluida_em = v === 'Feito' ? new Date().toISOString() : null;

  const supabase = createClient();
  const { error } = await supabase.from('tarefas').update(dados).eq('id', id);
  checar(error);

  const nomes = { status: 'o status', prioridade: 'a prioridade', responsavel: 'o responsável', prazo: 'o prazo', grupo_id: 'o grupo', titulo: 'o nome', descricao: 'a descrição' };
  const desc = rotulo ? `mudou ${nomes[campo]} para ${rotulo}` : `atualizou ${nomes[campo]}`;
  await registrar(supabase, id, desc);
  revalidarSetor(setor, id);
}

export async function excluirTarefa({ id, setor }) {
  const supabase = createClient();
  const { error } = await supabase.from('tarefas').delete().eq('id', id);
  checar(error);
  revalidarSetor(setor);
  redirect(`/setor/${setor}`);
}

// ---------------------------------------------------------------- Subtarefas

export async function adicionarSubtarefa({ tarefa_id, setor, texto }) {
  const t = limpar(texto, 300);
  if (!t) throw new Error('Escreva a subtarefa.');
  const supabase = createClient();
  const { error } = await supabase.from('tarefa_subtarefas').insert({ tarefa_id, texto: t });
  checar(error);
  revalidarSetor(setor, tarefa_id);
}

export async function alternarSubtarefa({ id, tarefa_id, setor, feito, texto }) {
  const supabase = createClient();
  const { error } = await supabase.from('tarefa_subtarefas').update({ feito: !!feito }).eq('id', id);
  checar(error);
  if (feito) await registrar(supabase, tarefa_id, `concluiu a subtarefa "${texto}"`);
  revalidarSetor(setor, tarefa_id);
}

export async function removerSubtarefa({ id, tarefa_id, setor }) {
  const supabase = createClient();
  const { error } = await supabase.from('tarefa_subtarefas').delete().eq('id', id);
  checar(error);
  revalidarSetor(setor, tarefa_id);
}

// ---------------------------------------------------------------- Atualizações

export async function publicarAtualizacao({ tarefa_id, setor, texto }) {
  const t = limpar(texto, 5000);
  if (!t) throw new Error('Escreva a atualização.');
  const perfil = await getPerfil();
  const supabase = createClient();
  const { error } = await supabase.from('tarefa_atualizacoes').insert({ tarefa_id, texto: t, autor_nome: perfil?.nome || 'Alguém' });
  checar(error);
  revalidarSetor(setor, tarefa_id);
}

export async function removerAtualizacao({ id, tarefa_id, setor }) {
  const supabase = createClient();
  const { error } = await supabase.from('tarefa_atualizacoes').delete().eq('id', id);
  checar(error);
  revalidarSetor(setor, tarefa_id);
}

// ---------------------------------------------------------------- Acesso por setor (só administrador)

export async function alternarAcessoSetor({ user_id, setor, liberar }) {
  if (!SLUGS.includes(setor)) throw new Error('Setor inválido.');
  const perfil = await getPerfil();
  if (!perfil?.admin) throw new Error('Só o administrador pode mudar acessos.');
  const supabase = createClient();
  const { error } = liberar
    ? await supabase.from('equipe_setores').upsert({ user_id, setor }, { ignoreDuplicates: true })
    : await supabase.from('equipe_setores').delete().eq('user_id', user_id).eq('setor', setor);
  checar(error);
  revalidatePath('/');
}
