'use server';

// Ficha do aluno (Sucesso do Cliente): cadastro, foto, origem, indicações e cashback das indicações.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { MOTIVOS, lerValor } from '@/lib/cashback';
import { STATUS_INDICACAO } from '@/lib/aluno';

async function exigirSucesso() {
  const perfil = await getPerfil();
  if (!perfil || !podeSetor(perfil, 'sucesso')) throw new Error('Você não tem acesso ao Sucesso do Cliente.');
  return perfil;
}
const txt = (fd, k, max = 300) => {
  const v = String(fd.get(k) ?? '').trim().slice(0, max);
  return v || null;
};
const data = (fd, k) => (/^\d{4}-\d{2}-\d{2}$/.test(String(fd.get(k) || '')) ? String(fd.get(k)) : null);
const checar = (error) => {
  if (!error) return;
  if (/foto_url|evento_origem|consultor|faixa_faturamento|indicado_por|indicacoes/.test(error.message)) {
    throw new Error('Falta ativar a ficha do aluno: rode o arquivo supabase/ficha-aluno.sql no Supabase.');
  }
  throw new Error(error.message);
};
const revalidar = (id) => {
  revalidatePath(`/alunos/${id}`);
  revalidatePath(`/clientes/${id}`);
  revalidatePath('/treinamentos');
};

// Cadastro completo (o formulário "Editar ficha")
export async function salvarFicha(formData) {
  await exigirSucesso();
  const id = String(formData.get('id'));
  const indicadoPor = txt(formData, 'indicado_por_id', 40);
  const dados = {
    nome: txt(formData, 'nome', 160) || 'Sem nome',
    empresa: txt(formData, 'empresa', 160) || '—',
    data_nascimento: data(formData, 'data_nascimento'),
    cpf: txt(formData, 'cpf', 20),
    rg: txt(formData, 'rg', 20),
    email: txt(formData, 'email', 160),
    celular: txt(formData, 'celular', 30),
    endereco: txt(formData, 'endereco', 200),
    bairro: txt(formData, 'bairro', 100),
    cidade: txt(formData, 'cidade', 100),
    estado: txt(formData, 'estado', 40),
    cep: txt(formData, 'cep', 12),
    cnpj: txt(formData, 'cnpj', 20),
    segmento: txt(formData, 'segmento', 100),
    faixa_faturamento: txt(formData, 'faixa_faturamento', 60),
    site: txt(formData, 'site', 200),
    instagram: txt(formData, 'instagram', 100),
    evento_origem: txt(formData, 'evento_origem', 120),
    consultor: txt(formData, 'consultor', 120),
    closer: txt(formData, 'closer', 120),
    indicado_por_id: indicadoPor && indicadoPor !== id ? indicadoPor : null,
    indicado_por_nome: indicadoPor ? null : txt(formData, 'indicado_por_nome', 160),
  };
  const { error } = await createClient().from('clientes').update(dados).eq('id', id);
  checar(error);
  revalidar(id);
  redirect(`/alunos/${id}?salvo=1`);
}

// Foto (a imagem sobe direto do navegador para o Storage; aqui só grava o endereço)
export async function salvarFoto({ id, url }) {
  await exigirSucesso();
  const limpo = typeof url === 'string' && /^https:\/\//.test(url) ? url.slice(0, 600) : null;
  const { error } = await createClient().from('clientes').update({ foto_url: limpo }).eq('id', id);
  checar(error);
  revalidar(id);
}

// ---------------------------------------------------------------- Indicações

export async function criarIndicacao(formData) {
  const perfil = await exigirSucesso();
  const indicador = String(formData.get('indicador_id'));
  const nome = txt(formData, 'nome', 160);
  if (!nome) throw new Error('Escreva o nome de quem foi indicado.');
  const { error } = await createClient().from('indicacoes').insert({
    indicador_id: indicador,
    nome,
    empresa: txt(formData, 'empresa', 160),
    telefone: txt(formData, 'telefone', 30),
    email: txt(formData, 'email', 160),
    produto: txt(formData, 'produto', 40),
    observacoes: txt(formData, 'observacoes', 1000),
    criado_por: perfil.nome,
  });
  checar(error);
  revalidar(indicador);
}

export async function mudarIndicacao(formData) {
  await exigirSucesso();
  const id = String(formData.get('id'));
  const indicador = String(formData.get('indicador_id'));
  const dados = { atualizado_em: new Date().toISOString() };
  const status = String(formData.get('status') || '');
  if (STATUS_INDICACAO.some((s) => s.nome === status)) dados.status = status;
  if (formData.has('valor_venda')) {
    const v = lerValor(formData.get('valor_venda'));
    dados.valor_venda = Number.isFinite(v) && v > 0 ? v : null;
  }
  const { error } = await createClient().from('indicacoes').update(dados).eq('id', id);
  checar(error);
  revalidar(indicador);
}

export async function removerIndicacao(formData) {
  await exigirSucesso();
  const indicador = String(formData.get('indicador_id'));
  const { error } = await createClient().from('indicacoes').delete().eq('id', String(formData.get('id')));
  checar(error);
  revalidar(indicador);
}

// Indicação que fechou: lança o cashback para quem indicou (uma vez por indicação)
export async function cashbackDaIndicacao(formData) {
  const perfil = await exigirSucesso();
  const id = String(formData.get('id'));
  const indicador = String(formData.get('indicador_id'));
  const padrao = MOTIVOS.find((m) => m.categoria === 'Indicação')?.valor || 0;
  const v = lerValor(formData.get('valor'));
  const valor = Number.isFinite(v) && v > 0 ? v : padrao;
  const supabase = createClient();
  const { data: ind } = await supabase.from('indicacoes').select('nome, cashback_mov_id').eq('id', id).maybeSingle();
  if (!ind) throw new Error('Indicação não encontrada.');
  if (ind.cashback_mov_id) throw new Error('O cashback dessa indicação já foi lançado.');
  const { data: mov, error } = await supabase
    .from('cashback_movimentos')
    .insert({ cliente_id: indicador, tipo: 'credito', valor, categoria: 'Indicação', motivo: `Indicou ${ind.nome}`, autor: perfil.nome })
    .select('id')
    .single();
  checar(error);
  const { error: e2 } = await supabase.from('indicacoes').update({ status: 'Fechou', cashback_mov_id: mov.id, atualizado_em: new Date().toISOString() }).eq('id', id);
  checar(e2);
  revalidar(indicador);
  revalidatePath('/cashback');
}
