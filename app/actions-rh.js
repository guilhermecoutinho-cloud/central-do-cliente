'use server';

// RH: organograma, avaliações e reuniões. Só quem tem acesso ao setor de RH (e o administrador).

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { COMPETENCIAS } from '@/lib/rh';

async function exigirRh() {
  const perfil = await getPerfil();
  if (!perfil || !podeSetor(perfil, 'rh')) throw new Error('Você não tem acesso ao RH.');
  return perfil;
}
const t = (fd, k, max = 300) => String(fd.get(k) || '').trim().slice(0, max) || null;
const dia = (fd, k) => (/^\d{4}-\d{2}-\d{2}$/.test(String(fd.get(k) || '')) ? String(fd.get(k)) : null);
function checar(error) {
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------- Organograma

const txt = (v, max) => String(v ?? '').trim().slice(0, max) || null;

function dadosPessoa(d) {
  return {
    nome: txt(d.nome, 120),
    cargo: txt(d.cargo, 120),
    area: txt(d.area, 80),
    gestor_id: txt(d.gestor_id, 40),
    email: txt(d.email, 160),
    telefone: txt(d.telefone, 40),
    admissao: /^\d{4}-\d{2}-\d{2}$/.test(String(d.admissao || '')) ? d.admissao : null,
  };
}
const CAMPOS_PESSOA = 'id, nome, cargo, area, gestor_id, email, telefone, admissao, ordem';

// Cria (sem id) ou edita (com id) uma pessoa do organograma e devolve como ficou
export async function salvarPessoa({ id, dados: entrada }) {
  await exigirRh();
  const dados = dadosPessoa(entrada || {});
  if (!dados.nome) throw new Error('Preencha o nome.');
  const supabase = createClient();
  if (id && dados.gestor_id) {
    // Não deixa alguém reportar a si mesmo nem a alguém que está abaixo dele
    const { data: todas } = await supabase.from('rh_pessoas').select('id, gestor_id');
    const pai = Object.fromEntries((todas || []).map((x) => [x.id, x.gestor_id]));
    let atual = dados.gestor_id;
    for (let i = 0; atual && i < 500; i++) {
      if (atual === id) throw new Error('Essa pessoa não pode reportar a alguém que está abaixo dela.');
      atual = pai[atual];
    }
  }
  const q = id ? supabase.from('rh_pessoas').update(dados).eq('id', id) : supabase.from('rh_pessoas').insert(dados);
  const { data, error } = await q.select(CAMPOS_PESSOA).single();
  checar(error);
  revalidatePath('/rh/organograma');
  return data;
}

export async function tirarPessoa({ id }) {
  await exigirRh();
  const supabase = createClient();
  // Quem reportava a essa pessoa passa a reportar ao gestor dela
  const { data: p } = await supabase.from('rh_pessoas').select('gestor_id').eq('id', id).maybeSingle();
  const { error: e1 } = await supabase.from('rh_pessoas').update({ gestor_id: p?.gestor_id || null }).eq('gestor_id', id);
  checar(e1);
  const { error } = await supabase.from('rh_pessoas').delete().eq('id', id);
  checar(error);
  revalidatePath('/rh/organograma');
  revalidatePath('/rh/avaliacoes');
}

// ---------------------------------------------------------------- Avaliações

export async function criarAvaliacao(formData) {
  const perfil = await exigirRh();
  const pessoa_id = t(formData, 'pessoa_id', 40);
  const periodo = t(formData, 'periodo', 80);
  if (!pessoa_id || !periodo) throw new Error('Escolha a pessoa e o período.');
  const notas = {};
  COMPETENCIAS.forEach((c, i) => {
    const n = Number(formData.get('c' + i));
    if (n >= 1 && n <= 5) notas[c] = n;
  });
  const { error } = await createClient().from('rh_avaliacoes').insert({
    pessoa_id,
    periodo,
    avaliador: t(formData, 'avaliador', 120) || perfil.nome,
    notas,
    pontos_fortes: t(formData, 'pontos_fortes', 3000),
    desenvolver: t(formData, 'desenvolver', 3000),
    plano_acao: t(formData, 'plano_acao', 3000),
    data: dia(formData, 'data') || undefined,
  });
  checar(error);
  revalidatePath('/rh/avaliacoes');
}

export async function removerAvaliacao(formData) {
  await exigirRh();
  const { error } = await createClient().from('rh_avaliacoes').delete().eq('id', String(formData.get('id')));
  checar(error);
  revalidatePath('/rh/avaliacoes');
}

// ---------------------------------------------------------------- Reuniões

export async function criarReuniao(formData) {
  await exigirRh();
  const titulo = t(formData, 'titulo', 160);
  const quando = String(formData.get('data') || '');
  if (!titulo || !quando) throw new Error('Preencha o título e a data.');
  const { error } = await createClient().from('rh_reunioes').insert({
    titulo,
    tipo: t(formData, 'tipo', 40) || 'Equipe',
    data: new Date(quando + ':00-03:00').toISOString(),
    pessoa_id: t(formData, 'pessoa_id', 40),
    participantes: t(formData, 'participantes', 600),
    pauta: t(formData, 'pauta', 4000),
  });
  checar(error);
  revalidatePath('/rh/reunioes');
}

export async function salvarAta(formData) {
  await exigirRh();
  const { error } = await createClient()
    .from('rh_reunioes')
    .update({ ata: t(formData, 'ata', 8000), pauta: t(formData, 'pauta', 4000) })
    .eq('id', String(formData.get('id')));
  checar(error);
  revalidatePath('/rh/reunioes');
}

export async function removerReuniao(formData) {
  await exigirRh();
  const { error } = await createClient().from('rh_reunioes').delete().eq('id', String(formData.get('id')));
  checar(error);
  revalidatePath('/rh/reunioes');
}
