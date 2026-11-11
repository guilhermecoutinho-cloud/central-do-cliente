'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ETAPAS } from '@/lib/onboarding';
import { texto } from '@/lib/util';

function checar(error) {
  if (error) throw new Error(error.message);
}

function inteiro(formData, campo, padrao = 0) {
  const n = parseInt(String(formData.get(campo) ?? ''), 10);
  return Number.isFinite(n) ? n : padrao;
}

function revalidarCliente(id) {
  revalidatePath('/');
  revalidatePath('/onboarding');
  revalidatePath(`/clientes/${id}`);
}

// ---------------------------------------------------------------- Clientes

export async function criarCliente(formData) {
  const supabase = createClient();
  const nome = texto(formData, 'nome');
  const empresa = texto(formData, 'empresa');
  const produto = texto(formData, 'produto');
  if (!nome || !empresa || !produto) throw new Error('Preencha nome, empresa e produto.');

  const { data, error } = await supabase
    .from('clientes')
    .insert({
      nome,
      empresa,
      produto,
      data_inicio: texto(formData, 'data_inicio'),
      encontros_contratados: inteiro(formData, 'encontros_contratados'),
      condicoes: texto(formData, 'condicoes'),
      responsavel: texto(formData, 'responsavel'),
      substituto: texto(formData, 'substituto'),
      closer: texto(formData, 'closer'),
    })
    .select('id')
    .single();
  checar(error);

  const { error: e2 } = await supabase.from('membros').insert({
    cliente_id: data.id,
    nome,
    cargo: texto(formData, 'cargo') || 'Sócio',
    telefone: texto(formData, 'telefone'),
    email: texto(formData, 'email'),
    papel: 'Decisor',
  });
  checar(e2);

  revalidatePath('/');
  revalidatePath('/onboarding');
  redirect(`/clientes/${data.id}?aba=onboarding`);
}

const CAMPOS_CADASTRO = [
  'nome', 'empresa', 'produto', 'responsavel', 'substituto', 'data_inicio', 'condicoes',
  'cnpj', 'segmento', 'cidade', 'site', 'instagram', 'closer', 'observacoes',
];

export async function atualizarCliente(formData) {
  const supabase = createClient();
  const id = texto(formData, 'id');
  const dados = {};
  for (const c of CAMPOS_CADASTRO) {
    if (formData.has(c)) dados[c] = texto(formData, c);
  }
  if (formData.has('encontros_contratados')) dados.encontros_contratados = inteiro(formData, 'encontros_contratados');
  if (dados.nome === null) delete dados.nome;
  if (dados.empresa === null) delete dados.empresa;
  if (dados.produto === null) delete dados.produto;
  const { error } = await supabase.from('clientes').update(dados).eq('id', id);
  checar(error);
  revalidarCliente(id);
}

export async function mudarStatus(formData) {
  const supabase = createClient();
  const id = texto(formData, 'id');
  const status = texto(formData, 'status');
  const { error } = await supabase.from('clientes').update({ status }).eq('id', id);
  checar(error);
  revalidarCliente(id);
}

export async function definirPerfil(formData) {
  const supabase = createClient();
  const id = texto(formData, 'id');
  const { error } = await supabase.from('clientes').update({ perfil: texto(formData, 'perfil') }).eq('id', id);
  checar(error);
  revalidarCliente(id);
}

export async function registrarRenovacao(formData) {
  const supabase = createClient();
  const id = texto(formData, 'id');
  const qtd = inteiro(formData, 'quantidade');
  if (qtd <= 0) throw new Error('Informe quantos encontros entram na renovação.');
  const { data: c, error } = await supabase.from('clientes').select('encontros_contratados').eq('id', id).single();
  checar(error);
  const { error: e2 } = await supabase
    .from('clientes')
    .update({ encontros_contratados: (c.encontros_contratados || 0) + qtd, status: 'ativo' })
    .eq('id', id);
  checar(e2);
  await supabase.from('acompanhamentos').insert({
    cliente_id: id,
    motivo: 'Renovação',
    como_foi: `Renovou com +${qtd} encontros`,
    proposto: texto(formData, 'obs'),
  });
  revalidarCliente(id);
}

export async function excluirCliente(formData) {
  const supabase = createClient();
  const id = texto(formData, 'id');
  if (texto(formData, 'confirmacao') !== 'EXCLUIR') throw new Error('Para excluir, digite EXCLUIR no campo de confirmação.');
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  checar(error);
  revalidatePath('/');
  revalidatePath('/onboarding');
  redirect('/');
}

// ---------------------------------------------------------------- Onboarding

export async function alternarTarefa(formData) {
  const supabase = createClient();
  const id = texto(formData, 'cliente_id');
  const chave = texto(formData, 'chave');
  const feito = formData.get('feito') === '1';
  if (feito) {
    const { error } = await supabase
      .from('onboarding_tarefas')
      .upsert({ cliente_id: id, chave, feito: true, feito_em: new Date().toISOString() });
    checar(error);
  } else {
    const { error } = await supabase.from('onboarding_tarefas').delete().eq('cliente_id', id).eq('chave', chave);
    checar(error);
  }
  revalidarCliente(id);
}

export async function mudarEtapa(formData) {
  const supabase = createClient();
  const id = texto(formData, 'cliente_id');
  const etapa = Math.min(Math.max(inteiro(formData, 'etapa'), 0), ETAPAS.length - 1);
  const dados = { etapa_onboarding: etapa };
  if (etapa === ETAPAS.length - 1) dados.status = 'ativo';
  const { error } = await supabase.from('clientes').update(dados).eq('id', id);
  checar(error);
  revalidarCliente(id);
  redirect(`/clientes/${id}?aba=onboarding&etapa=${etapa}`);
}

// ---------------------------------------------------------------- Time do cliente

export async function adicionarMembro(formData) {
  const supabase = createClient();
  const id = texto(formData, 'cliente_id');
  const nome = texto(formData, 'nome');
  if (!nome) throw new Error('Informe o nome da pessoa.');
  const { error } = await supabase.from('membros').insert({
    cliente_id: id,
    nome,
    cargo: texto(formData, 'cargo'),
    telefone: texto(formData, 'telefone'),
    email: texto(formData, 'email'),
    email_celular: texto(formData, 'email_celular'),
    papel: texto(formData, 'papel'),
  });
  checar(error);
  revalidarCliente(id);
}

export async function alternarAcessoMembro(formData) {
  const supabase = createClient();
  const id = texto(formData, 'cliente_id');
  const { error } = await supabase
    .from('membros')
    .update({ acesso_liberado: formData.get('liberado') === '1' })
    .eq('id', texto(formData, 'membro_id'));
  checar(error);
  revalidarCliente(id);
}

export async function removerMembro(formData) {
  const supabase = createClient();
  const id = texto(formData, 'cliente_id');
  const { error } = await supabase.from('membros').delete().eq('id', texto(formData, 'membro_id'));
  checar(error);
  revalidarCliente(id);
}

// ---------------------------------------------------------------- Acessos

export async function adicionarAcesso(formData) {
  const supabase = createClient();
  const id = texto(formData, 'cliente_id');
  const plataforma = texto(formData, 'plataforma');
  if (!plataforma) throw new Error('Informe a plataforma.');
  const { error } = await supabase.from('acessos').insert({
    cliente_id: id,
    plataforma,
    detalhe: texto(formData, 'detalhe'),
    liberado: formData.get('liberado') === '1',
  });
  checar(error);
  revalidarCliente(id);
}

export async function alternarAcesso(formData) {
  const supabase = createClient();
  const id = texto(formData, 'cliente_id');
  const { error } = await supabase
    .from('acessos')
    .update({ liberado: formData.get('liberado') === '1' })
    .eq('id', texto(formData, 'acesso_id'));
  checar(error);
  revalidarCliente(id);
}

export async function removerAcesso(formData) {
  const supabase = createClient();
  const id = texto(formData, 'cliente_id');
  const { error } = await supabase.from('acessos').delete().eq('id', texto(formData, 'acesso_id'));
  checar(error);
  revalidarCliente(id);
}

// ---------------------------------------------------------------- Acompanhamentos

export async function adicionarAcompanhamento(formData) {
  const supabase = createClient();
  const id = texto(formData, 'cliente_id');
  const motivo = texto(formData, 'motivo');
  if (!motivo) throw new Error('Informe o motivo.');
  const { error } = await supabase.from('acompanhamentos').insert({
    cliente_id: id,
    data: texto(formData, 'data') || undefined,
    motivo,
    como_foi: texto(formData, 'como_foi'),
    proposto: texto(formData, 'proposto'),
    autor: texto(formData, 'autor'),
  });
  checar(error);
  revalidarCliente(id);
}

export async function removerAcompanhamento(formData) {
  const supabase = createClient();
  const id = texto(formData, 'cliente_id');
  const { error } = await supabase.from('acompanhamentos').delete().eq('id', texto(formData, 'acomp_id'));
  checar(error);
  revalidarCliente(id);
}

// ---------------------------------------------------------------- Arquivos

export async function registrarArquivo({ cliente_id, setor, nome, caminho, tamanho }) {
  const supabase = createClient();
  const { error } = await supabase.from('arquivos').insert({ cliente_id, setor, nome, caminho, tamanho });
  checar(error);
  revalidarCliente(cliente_id);
}

export async function removerArquivo(formData) {
  const supabase = createClient();
  const id = texto(formData, 'cliente_id');
  const caminho = texto(formData, 'caminho');
  if (caminho) await supabase.storage.from('arquivos').remove([caminho]);
  const { error } = await supabase.from('arquivos').delete().eq('id', texto(formData, 'arquivo_id'));
  checar(error);
  revalidarCliente(id);
}

// ---------------------------------------------------------------- Encontros e presença

export async function criarEncontro(formData) {
  const supabase = createClient();
  const produto = texto(formData, 'produto');
  const titulo = texto(formData, 'titulo');
  const quando = texto(formData, 'data'); // "2026-11-18T19:00" no horário de Brasília
  if (!produto || !titulo || !quando) throw new Error('Preencha produto, título e data.');
  const data = new Date(quando + ':00-03:00').toISOString();
  const { error } = await supabase.from('encontros').insert({ produto, titulo, data, link: texto(formData, 'link') });
  checar(error);
  revalidatePath('/encontros');
  revalidatePath('/');
}

export async function excluirEncontro(formData) {
  const supabase = createClient();
  const { error } = await supabase.from('encontros').delete().eq('id', texto(formData, 'encontro_id'));
  checar(error);
  revalidatePath('/encontros');
  revalidatePath('/');
  redirect('/encontros');
}

export async function marcarPresenca(formData) {
  const supabase = createClient();
  const encontro_id = texto(formData, 'encontro_id');
  const membro_id = texto(formData, 'membro_id');
  const valor = texto(formData, 'presente');
  if (valor === 'limpar') {
    const { error } = await supabase.from('presencas').delete().eq('encontro_id', encontro_id).eq('membro_id', membro_id);
    checar(error);
  } else {
    const { error } = await supabase
      .from('presencas')
      .upsert({ encontro_id, membro_id, presente: valor === '1', marcado_em: new Date().toISOString() });
    checar(error);
  }
  revalidatePath(`/encontros/${encontro_id}`);
  revalidatePath('/');
}

export async function marcarRestantesComoFalta(formData) {
  const supabase = createClient();
  const encontro_id = texto(formData, 'encontro_id');
  const ids = String(formData.get('membros') || '').split(',').filter(Boolean);
  if (ids.length) {
    const linhas = ids.map((membro_id) => ({ encontro_id, membro_id, presente: false }));
    const { error } = await supabase.from('presencas').upsert(linhas, { ignoreDuplicates: true });
    checar(error);
  }
  revalidatePath(`/encontros/${encontro_id}`);
  revalidatePath('/');
}

// ---------------------------------------------------------------- Assessment

export async function adicionarPergunta(formData) {
  const supabase = createClient();
  const textoPergunta = texto(formData, 'texto');
  if (!textoPergunta) throw new Error('Escreva a pergunta.');
  const { data: ultimas } = await supabase.from('assessment_perguntas').select('ordem').order('ordem', { ascending: false }).limit(1);
  const ordem = ultimas && ultimas.length ? ultimas[0].ordem + 1 : 1;
  const { error } = await supabase.from('assessment_perguntas').insert({ texto: textoPergunta, ordem });
  checar(error);
  revalidatePath('/assessment');
}

export async function alternarPergunta(formData) {
  const supabase = createClient();
  const { error } = await supabase
    .from('assessment_perguntas')
    .update({ ativa: formData.get('ativa') === '1' })
    .eq('id', texto(formData, 'pergunta_id'));
  checar(error);
  revalidatePath('/assessment');
}

export async function removerPergunta(formData) {
  const supabase = createClient();
  const { error } = await supabase.from('assessment_perguntas').delete().eq('id', texto(formData, 'pergunta_id'));
  checar(error);
  revalidatePath('/assessment');
}
