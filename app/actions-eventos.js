'use server';

// Eventos: criar, checklist de cada setor e avaliação depois do evento.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient as clienteServico } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { SUPABASE_URL } from '@/lib/supabase/config';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { CHECKLIST_PADRAO, SETORES_EVENTO } from '@/lib/eventos';

async function exigirEventos() {
  const perfil = await getPerfil();
  if (!perfil || !(perfil.admin || podeSetor(perfil, 'eventos'))) throw new Error('Só o administrador ou o setor de Eventos pode fazer isso.');
  return perfil;
}

function servico() {
  const chave = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return chave ? clienteServico(SUPABASE_URL, chave, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

const texto = (fd, k, max = 300) => String(fd.get(k) || '').trim().slice(0, max) || null;
const data = (fd, k) => (/^\d{4}-\d{2}-\d{2}$/.test(String(fd.get(k) || '')) ? String(fd.get(k)) : null);

function atualizar(eventoId) {
  revalidatePath('/eventos');
  if (eventoId) revalidatePath(`/eventos/${eventoId}`);
  revalidatePath('/lideranca');
}

export async function criarEvento(formData) {
  await exigirEventos();
  const nome = texto(formData, 'nome', 120);
  if (!nome) throw new Error('Dê um nome ao evento.');
  const supabase = createClient();
  const { data: ev, error } = await supabase
    .from('eventos')
    .insert({ nome, tipo: texto(formData, 'tipo', 60), data_inicio: data(formData, 'data_inicio'), data_fim: data(formData, 'data_fim'), local: texto(formData, 'local', 160) })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  if (formData.get('checklist') === 'sim') {
    const itens = SETORES_EVENTO.flatMap((setor) => CHECKLIST_PADRAO[setor].map((titulo, ordem) => ({ evento_id: ev.id, setor, titulo, ordem })));
    // O checklist de todos os setores entra de uma vez (quem cria pode não ter acesso a todos os setores)
    const cliente = servico() || supabase;
    const { error: e2 } = await cliente.from('evento_itens').insert(itens);
    if (e2) throw new Error(e2.message);
  }
  atualizar(ev.id);
  redirect(`/eventos/${ev.id}`);
}

export async function editarEvento(formData) {
  await exigirEventos();
  const id = String(formData.get('id'));
  const supabase = createClient();
  const { error } = await supabase
    .from('eventos')
    .update({ nome: texto(formData, 'nome', 120) || 'Evento', tipo: texto(formData, 'tipo', 60), data_inicio: data(formData, 'data_inicio'), data_fim: data(formData, 'data_fim'), local: texto(formData, 'local', 160) })
    .eq('id', id);
  if (error) throw new Error(error.message);
  atualizar(id);
}

export async function excluirEvento(formData) {
  await exigirEventos();
  const supabase = createClient();
  const { error } = await supabase.from('eventos').delete().eq('id', String(formData.get('id')));
  if (error) throw new Error(error.message);
  atualizar(null);
  redirect('/eventos');
}

export async function avaliarEvento(formData) {
  const perfil = await exigirEventos();
  const id = String(formData.get('id'));
  const nota = formData.get('nota') === '' || formData.get('nota') === null ? null : Number(formData.get('nota'));
  const supabase = createClient();
  const { error } = await supabase
    .from('eventos')
    .update({
      avaliacao_nota: Number.isInteger(nota) && nota >= 0 && nota <= 10 ? nota : null,
      avaliacao_ok: texto(formData, 'avaliacao_ok', 4000),
      avaliacao_faltou: texto(formData, 'avaliacao_faltou', 4000),
      avaliado_por: perfil.nome,
      avaliado_em: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
  atualizar(id);
}

// ---------------------------------------------------------------- Checklist (cada setor marca o seu)

export async function marcarItem({ id, evento_id, estado }) {
  if (!['pendente', 'feito', 'faltou'].includes(estado)) throw new Error('Estado inválido.');
  const perfil = await getPerfil();
  const supabase = createClient();
  const { error } = await supabase
    .from('evento_itens')
    .update({ estado, atualizado_por: perfil?.nome || null, atualizado_em: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  atualizar(evento_id);
}

export async function adicionarItem({ evento_id, setor, titulo }) {
  const t = String(titulo || '').trim().slice(0, 200);
  if (!t) throw new Error('Escreva o item.');
  const supabase = createClient();
  const { data: novo, error } = await supabase.from('evento_itens').insert({ evento_id, setor, titulo: t, ordem: 999 }).select('*').single();
  if (error) throw new Error(error.message.includes('row-level') ? 'Você não tem acesso a este setor.' : error.message);
  atualizar(evento_id);
  return novo;
}

export async function removerItem({ id, evento_id }) {
  const supabase = createClient();
  const { error } = await supabase.from('evento_itens').delete().eq('id', id);
  if (error) throw new Error(error.message);
  atualizar(evento_id);
}
