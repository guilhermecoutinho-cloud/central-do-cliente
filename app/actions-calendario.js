'use server';

// Marketing > Social mídia > Calendário de conteúdo

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { hojeISO } from '@/lib/tarefas';
import { ESQUEMA_CALENDARIO, PADRAO, ehData, instrucoesCalendario, normalizarCalendario, proximoPeriodo } from '@/lib/calendario';

const CHAVE_GEMINI = () => (process.env.GEMINI_API_KEY || '').trim();
const MODELO = () => (process.env.GEMINI_MODELO || 'gemini-3.5-flash-lite').trim();
const MODELO_RESERVA = 'gemini-2.5-flash';
const CAMPOS_POST = 'id, calendario_id, data, data_fim, campanha, descricao, formato, link, feito, feito_em, responsavel, ordem';

async function exigirMarketing() {
  const perfil = await getPerfil();
  if (!perfil || !podeSetor(perfil, 'marketing')) throw new Error('Você não tem acesso ao Marketing.');
  return perfil;
}
const revalidar = () => {
  revalidatePath('/marketing/calendario');
  revalidatePath('/', 'layout');
};
const checar = (error) => {
  if (error) throw new Error(/conteudo_/.test(error.message) ? 'Falta ativar o calendário: rode o arquivo supabase/calendario-conteudo.sql no Supabase.' : error.message);
};
const txt = (v, max) => {
  const s = String(v ?? '').trim().slice(0, max);
  return s || null;
};

// Grava um calendário já normalizado (com os posts) e devolve o id
async function gravar(supabase, { calendario, posts }, autor) {
  const { data: cal, error } = await supabase
    .from('conteudo_calendarios')
    .insert({ ...calendario, criado_por: autor })
    .select('id')
    .single();
  checar(error);
  if (posts.length) {
    const { error: e2 } = await supabase.from('conteudo_posts').insert(posts.map((p) => ({ ...p, calendario_id: cal.id, feito: Boolean(p.link) })));
    if (e2) {
      await supabase.from('conteudo_calendarios').delete().eq('id', cal.id);
      checar(e2);
    }
  }
  return cal.id;
}

// ---------------------------------------------------------------- Calendários

// Novo calendário em branco ou "próximo mês" copiando o padrão (funil e regras) de outro
export async function criarCalendario({ inicio, fim, titulo, copiarDe }) {
  const perfil = await exigirMarketing();
  const supabase = createClient();
  let base = { titulo: PADRAO.titulo, subtitulo: PADRAO.subtitulo, funil: PADRAO.funil, regras: PADRAO.regras };
  if (copiarDe) {
    const { data } = await supabase.from('conteudo_calendarios').select('titulo, subtitulo, funil, regras, inicio, fim').eq('id', copiarDe).maybeSingle();
    if (data) {
      base = { titulo: data.titulo, subtitulo: data.subtitulo, funil: data.funil, regras: data.regras };
      if (!ehData(inicio)) ({ inicio, fim } = proximoPeriodo(data));
    }
  }
  if (!ehData(inicio) || !ehData(fim) || fim < inicio) throw new Error('Escolha o primeiro e o último dia do calendário.');
  const { data, error } = await supabase
    .from('conteudo_calendarios')
    .insert({ ...base, titulo: txt(titulo, 80) || base.titulo, inicio, fim, eventos: [], semanas: {}, criado_por: perfil.nome })
    .select('id')
    .single();
  checar(error);
  revalidar();
  return data.id;
}

export async function editarCalendario({ id, dados }) {
  await exigirMarketing();
  const limpo = {};
  if ('titulo' in dados) limpo.titulo = txt(dados.titulo, 80) || PADRAO.titulo;
  if ('subtitulo' in dados) limpo.subtitulo = txt(dados.subtitulo, 80) || '';
  if ('inicio' in dados && ehData(dados.inicio)) limpo.inicio = dados.inicio;
  if ('fim' in dados && ehData(dados.fim)) limpo.fim = dados.fim;
  if (limpo.inicio && limpo.fim && limpo.fim < limpo.inicio) throw new Error('O último dia precisa ser depois do primeiro.');
  if ('funil' in dados) limpo.funil = (dados.funil || []).map((f) => txt(f, 40)).filter(Boolean).slice(0, 8);
  if ('regras' in dados) limpo.regras = (dados.regras || []).map((r) => ({ rotulo: txt(r.rotulo, 30), texto: txt(r.texto, 160) })).filter((r) => r.rotulo && r.texto).slice(0, 5);
  if ('eventos' in dados) limpo.eventos = (dados.eventos || []).map((e) => ({ nome: txt(e.nome, 30), datas: txt(e.datas, 30) || '' })).filter((e) => e.nome).slice(0, 8);
  if ('semanas' in dados) {
    limpo.semanas = Object.fromEntries(Object.entries(dados.semanas || {}).filter(([k, v]) => ehData(k) && txt(v, 80)).map(([k, v]) => [k, txt(v, 80)]));
  }
  if ('nota' in dados) limpo.nota = txt(dados.nota, 600);
  const { error } = await createClient().from('conteudo_calendarios').update(limpo).eq('id', id);
  checar(error);
  revalidar();
}

export async function excluirCalendario({ id }) {
  await exigirMarketing();
  const { error } = await createClient().from('conteudo_calendarios').delete().eq('id', id);
  checar(error);
  revalidar();
}

// ---------------------------------------------------------------- Posts

function dadosPost(e) {
  const limpo = {};
  if ('data' in e) {
    if (!ehData(e.data)) throw new Error('Escolha a data do post.');
    limpo.data = e.data;
  }
  if ('data_fim' in e) limpo.data_fim = ehData(e.data_fim) ? e.data_fim : null;
  if ('campanha' in e) limpo.campanha = txt(e.campanha, 60);
  if ('descricao' in e) {
    limpo.descricao = txt(e.descricao, 400);
    if (!limpo.descricao) throw new Error('Escreva o conteúdo do post.');
  }
  if ('formato' in e) limpo.formato = txt(e.formato, 60);
  if ('responsavel' in e) limpo.responsavel = txt(e.responsavel, 40);
  if ('link' in e) {
    limpo.link = txt(e.link, 600);
    if (limpo.link && !/^https?:\/\//i.test(limpo.link)) limpo.link = 'https://' + limpo.link;
  }
  if ('feito' in e) limpo.feito = Boolean(e.feito);
  // Colou o link: conta como feito
  if (limpo.link && !('feito' in e)) limpo.feito = true;
  if ('feito' in limpo) limpo.feito_em = limpo.feito ? new Date().toISOString() : null;
  if (limpo.data && limpo.data_fim && limpo.data_fim <= limpo.data) limpo.data_fim = null;
  return limpo;
}

export async function criarPost({ calendario_id, dados }) {
  await exigirMarketing();
  const d = dadosPost({ descricao: '', ...dados });
  const { data, error } = await createClient().from('conteudo_posts').insert({ ...d, calendario_id }).select(CAMPOS_POST).single();
  checar(error);
  revalidar();
  return data;
}

export async function editarPost({ id, dados }) {
  await exigirMarketing();
  const d = dadosPost(dados);
  const { data, error } = await createClient().from('conteudo_posts').update(d).eq('id', id).select(CAMPOS_POST).single();
  checar(error);
  revalidar();
  return data;
}

export async function excluirPost({ id }) {
  await exigirMarketing();
  const { error } = await createClient().from('conteudo_posts').delete().eq('id', id);
  checar(error);
  revalidar();
}

// ---------------------------------------------------------------- Importar com IA (texto ou imagem)

async function chamarGemini(modelo, partes) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': CHAVE_GEMINI() },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instrucoesCalendario(hojeISO()) }] },
      contents: [{ role: 'user', parts: partes }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json', responseSchema: ESQUEMA_CALENDARIO },
    }),
    cache: 'no-store',
  });
  const corpo = await r.json().catch(() => ({}));
  return { status: r.status, corpo };
}

// A pessoa cola o calendário (texto) ou manda a imagem; a IA monta no padrão e já grava
export async function importarCalendario({ texto, imagem, tipo }) {
  const perfil = await exigirMarketing();
  if (!CHAVE_GEMINI()) return { erro: 'A IA ainda não foi ligada. O administrador precisa colocar a GEMINI_API_KEY na Vercel.' };
  const t = String(texto || '').trim().slice(0, 20000);
  const img = typeof imagem === 'string' && imagem.length > 100 ? imagem.replace(/^data:[^,]+,/, '') : null;
  if (!t && !img) return { erro: 'Cole o calendário ou escolha a imagem.' };
  if (img && img.length > 6_000_000) return { erro: 'A imagem é grande demais. Tente um print menor.' };

  const partes = [];
  if (img) partes.push({ inlineData: { mimeType: /^image\/(png|jpeg|webp)$/.test(tipo || '') ? tipo : 'image/jpeg', data: img } });
  partes.push({ text: t || 'Monte o calendário a partir desta imagem.' });

  let { status, corpo } = await chamarGemini(MODELO(), partes);
  if (status === 404 && MODELO() !== MODELO_RESERVA) ({ status, corpo } = await chamarGemini(MODELO_RESERVA, partes));
  if (status === 429) return { erro: 'A IA atingiu o limite de uso por agora. Tente de novo em 1 minuto.' };
  if (status !== 200) return { erro: 'A IA não conseguiu ler agora (erro ' + status + '). ' + (corpo?.error?.message || 'Tente de novo.') };

  let bruto;
  try {
    bruto = JSON.parse((corpo?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join(''));
  } catch {
    return { erro: 'Não consegui entender a resposta da IA. Tente de novo.' };
  }
  const pronto = normalizarCalendario(bruto, hojeISO());
  if (!pronto.posts.length) return { erro: 'A IA não achou posts nesse calendário. Confira se as datas estão visíveis.' };

  try {
    const id = await gravar(createClient(), pronto, perfil.nome);
    revalidar();
    return { id, posts: pronto.posts.length };
  } catch (e) {
    return { erro: e?.message || 'Não foi possível gravar.' };
  }
}
