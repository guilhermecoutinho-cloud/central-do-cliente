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

function dadosPessoa(fd) {
  return {
    nome: t(fd, 'nome', 120),
    cargo: t(fd, 'cargo', 120),
    area: t(fd, 'area', 80),
    gestor_id: t(fd, 'gestor_id', 40),
    email: t(fd, 'email', 160),
    telefone: t(fd, 'telefone', 40),
    admissao: dia(fd, 'admissao'),
  };
}

export async function criarPessoa(formData) {
  await exigirRh();
  const dados = dadosPessoa(formData);
  if (!dados.nome) throw new Error('Preencha o nome.');
  const { error } = await createClient().from('rh_pessoas').insert(dados);
  checar(error);
  revalidatePath('/rh/organograma');
}

export async function editarPessoa(formData) {
  await exigirRh();
  const id = String(formData.get('id'));
  const dados = dadosPessoa(formData);
  if (!dados.nome) throw new Error('Preencha o nome.');
  if (dados.gestor_id === id) dados.gestor_id = null;
  const { error } = await createClient().from('rh_pessoas').update(dados).eq('id', id);
  checar(error);
  revalidatePath('/rh/organograma');
}

export async function removerPessoa(formData) {
  await exigirRh();
  const id = String(formData.get('id'));
  const supabase = createClient();
  // Quem reportava a essa pessoa passa a reportar ao gestor dela
  const { data: p } = await supabase.from('rh_pessoas').select('gestor_id').eq('id', id).maybeSingle();
  await supabase.from('rh_pessoas').update({ gestor_id: p?.gestor_id || null }).eq('gestor_id', id);
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
