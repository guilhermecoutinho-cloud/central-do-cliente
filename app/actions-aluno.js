'use server';

// Treinamentos e área do aluno.
// O time marca o que cada pessoa do time do cliente já fez e cria o login do aluno.

import { randomInt } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { createClient as clienteServico } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { SUPABASE_URL } from '@/lib/supabase/config';
import { getPerfil, podeSetor } from '@/lib/perfil';

async function exigirSucesso() {
  const perfil = await getPerfil();
  if (!perfil || !podeSetor(perfil, 'sucesso')) throw new Error('Você não tem acesso ao Sucesso do Cliente.');
  return perfil;
}

function servico() {
  const chave = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!chave) throw new Error('Falta a SUPABASE_SERVICE_ROLE_KEY na Vercel para criar o acesso do aluno.');
  return clienteServico(SUPABASE_URL, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Senha fácil de ditar no WhatsApp: Caup + 6 números + 2 letras (sem letras parecidas)
function gerarSenha() {
  const letras = 'abcdefghjkmnpqrstuvwxyz';
  let num = '';
  for (let i = 0; i < 6; i++) num += randomInt(0, 10);
  return 'Caup' + num + letras[randomInt(0, letras.length)] + letras[randomInt(0, letras.length)];
}

// ---------------------------------------------------------------- Checks

export async function alternarTreinamento({ cliente_id, membro_id, treinamento_id, feito }) {
  const perfil = await exigirSucesso();
  const supabase = createClient();
  if (feito) {
    const { error } = await supabase
      .from('aluno_treinamentos')
      .upsert({ membro_id, treinamento_id, marcado_por: perfil.nome }, { onConflict: 'membro_id,treinamento_id' });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('aluno_treinamentos').delete().eq('membro_id', membro_id).eq('treinamento_id', treinamento_id);
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/clientes/${cliente_id}`);
  revalidatePath('/treinamentos');
}

// ---------------------------------------------------------------- Login do aluno

export async function criarAcessoAluno({ cliente_id, membro_id }) {
  await exigirSucesso();
  const supabase = createClient();
  const { data: m, error } = await supabase.from('membros').select('id, nome, email, email_celular, user_id').eq('id', membro_id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!m) throw new Error('Pessoa não encontrada.');
  const email = String(m.email || m.email_celular || '').trim().toLowerCase();
  if (!email) throw new Error('Cadastre o e-mail desta pessoa na aba Time antes de criar o acesso.');

  const adm = servico();
  const senha = gerarSenha();

  // Já tem login ligado: só gera uma senha nova
  if (m.user_id) {
    const { error: e } = await adm.auth.admin.updateUserById(m.user_id, { password: senha });
    if (e) throw new Error(e.message);
    return { email, senha, nova: false };
  }

  let userId = null;
  const { data: criado, error: eCriar } = await adm.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { tipo: 'aluno', nome: m.nome },
  });
  if (eCriar) {
    // O e-mail já tem usuário (ex.: aluno de outro cliente ou alguém do time)
    if (!/already|registered|exists/i.test(eCriar.message)) throw new Error(eCriar.message);
    const { data: lista } = await adm.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existente = (lista?.users || []).find((u) => (u.email || '').toLowerCase() === email);
    if (!existente) throw new Error('Esse e-mail já tem cadastro, mas não consegui encontrá-lo.');
    const { data: daEquipe } = await adm.from('equipe').select('user_id').eq('user_id', existente.id).maybeSingle();
    if (daEquipe) throw new Error('Esse e-mail é de alguém do time da Central. Use outro e-mail para o aluno.');
    const { data: jaAluno } = await adm.from('membros').select('id').eq('user_id', existente.id).maybeSingle();
    if (jaAluno && jaAluno.id !== m.id) throw new Error('Esse e-mail já é o acesso de outro aluno. Use outro e-mail.');
    const { error: eSenha } = await adm.auth.admin.updateUserById(existente.id, { password: senha });
    if (eSenha) throw new Error(eSenha.message);
    userId = existente.id;
  } else {
    userId = criado.user.id;
  }

  const { error: eLigar } = await supabase.from('membros').update({ user_id: userId }).eq('id', m.id);
  if (eLigar) throw new Error(eLigar.message);

  revalidatePath(`/clientes/${cliente_id}`);
  return { email, senha, nova: true };
}

export async function removerAcessoAluno({ cliente_id, membro_id }) {
  await exigirSucesso();
  const supabase = createClient();
  const { data: m } = await supabase.from('membros').select('user_id').eq('id', membro_id).maybeSingle();
  if (m?.user_id) {
    const adm = servico();
    await adm.from('membros').update({ user_id: null }).eq('id', membro_id);
    const { error } = await adm.auth.admin.deleteUser(m.user_id);
    if (error && !/not found/i.test(error.message)) throw new Error(error.message);
  }
  revalidatePath(`/clientes/${cliente_id}`);
}

// ---------------------------------------------------------------- Capas

export async function salvarTreinamento({ id, nome, descricao, capa_url, ativo }) {
  await exigirSucesso();
  const supabase = createClient();
  const dados = {};
  if (nome !== undefined) dados.nome = String(nome).trim().slice(0, 120) || undefined;
  if (descricao !== undefined) dados.descricao = String(descricao).trim().slice(0, 600) || null;
  if (capa_url !== undefined) dados.capa_url = capa_url || null;
  if (ativo !== undefined) dados.ativo = !!ativo;
  Object.keys(dados).forEach((k) => dados[k] === undefined && delete dados[k]);
  const { error } = await supabase.from('treinamentos').update(dados).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/treinamentos');
  revalidatePath('/aluno');
}
