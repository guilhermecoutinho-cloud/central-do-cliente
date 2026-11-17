'use server';

// Compras do Financeiro (por evento ou CAUP geral).

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { ETAPAS_COMPRA } from '@/lib/compras';

async function exigirFinanceiro() {
  const perfil = await getPerfil();
  if (!perfil || !podeSetor(perfil, 'financeiro')) throw new Error('Você não tem acesso ao Financeiro.');
  return perfil;
}
const CAMPOS = 'id, titulo, descricao, quantidade, valor, fornecedor, evento_id, etapa, responsavel, prazo, ordem, criado_por, criado_em, compra_comentarios(count)';
const comContagem = (c) => ({ ...c, comentarios: c.compra_comentarios?.[0]?.count || 0, compra_comentarios: undefined });

export async function criarCompra({ titulo, evento_id, etapa }) {
  const perfil = await exigirFinanceiro();
  const t = String(titulo || '').trim().slice(0, 200);
  if (!t) throw new Error('Escreva o que precisa comprar.');
  const { data, error } = await createClient()
    .from('compras')
    .insert({ titulo: t, evento_id: evento_id || null, etapa: ETAPAS_COMPRA.some((e) => e.id === etapa) ? etapa : 'orcamentos', criado_por: perfil.nome })
    .select(CAMPOS)
    .single();
  if (error) throw new Error(error.message);
  revalidatePath('/financeiro/compras');
  return comContagem(data);
}

export async function atualizarCompra({ id, dados }) {
  await exigirFinanceiro();
  const permitido = ['titulo', 'descricao', 'quantidade', 'valor', 'fornecedor', 'evento_id', 'etapa', 'responsavel', 'prazo'];
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
    if (k === 'etapa' && !ETAPAS_COMPRA.some((e) => e.id === v)) continue;
    if (k === 'titulo' && !v) continue;
    limpo[k] = v;
  }
  limpo.atualizado_em = new Date().toISOString();
  const { error } = await createClient().from('compras').update(limpo).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/financeiro/compras');
}

export async function excluirCompra({ id }) {
  await exigirFinanceiro();
  const { error } = await createClient().from('compras').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/financeiro/compras');
}

export async function listarComentarios({ compra_id }) {
  await exigirFinanceiro();
  const { data, error } = await createClient().from('compra_comentarios').select('*').eq('compra_id', compra_id).order('criado_em');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function comentarCompra({ compra_id, texto }) {
  const perfil = await exigirFinanceiro();
  const t = String(texto || '').trim().slice(0, 3000);
  if (!t) throw new Error('Escreva o comentário.');
  const { data, error } = await createClient().from('compra_comentarios').insert({ compra_id, texto: t, autor_nome: perfil.nome }).select('*').single();
  if (error) throw new Error(error.message);
  revalidatePath('/financeiro/compras');
  return data;
}
