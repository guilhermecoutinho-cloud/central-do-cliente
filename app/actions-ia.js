'use server';

// Criar tarefas com IA (Gemini): a pessoa cola um texto livre, o Gemini separa as tarefas,
// a pessoa revisa e só então elas são gravadas (com as regras de acesso de quem está logado).

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { setorPorSlug } from '@/lib/setores';
import { NOMES_PRIORIDADE, NOMES_STATUS, hojeISO } from '@/lib/tarefas';
import { acharPessoa, lerData, lerPrioridade, lerStatus, norm } from '@/lib/conector';

const CHAVE = () => (process.env.GEMINI_API_KEY || '').trim();
const MODELO = () => (process.env.GEMINI_MODELO || 'gemini-3.5-flash-lite').trim();
const MODELO_RESERVA = 'gemini-2.5-flash';
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

const ESQUEMA = {
  type: 'OBJECT',
  properties: {
    tarefas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          titulo: { type: 'STRING' },
          grupo: { type: 'STRING' },
          prazo: { type: 'STRING' },
          prioridade: { type: 'STRING', enum: NOMES_PRIORIDADE },
          status: { type: 'STRING', enum: NOMES_STATUS },
          responsavel: { type: 'STRING' },
          descricao: { type: 'STRING' },
        },
        required: ['titulo'],
      },
    },
  },
  required: ['tarefas'],
};

function instrucoes({ setor, hoje, grupos, equipe }) {
  const dia = DIAS[new Date(hoje + 'T12:00:00Z').getUTCDay()];
  return [
    `Você organiza tarefas para o quadro do setor "${setor.nome}" da Capital Upgrade (empresa de treinamentos e eventos empresariais).`,
    `Hoje é ${dia}, ${hoje}. Fuso de Brasília.`,
    `Grupos do quadro: ${grupos.map((g) => g.nome).join(', ') || 'nenhum'}.`,
    `Equipe: ${equipe.map((p) => p.nome).join(', ') || 'ninguém'}.`,
    '',
    'Leia o texto da pessoa (pode ser uma lista, ata de reunião ou mensagem) e devolva as tarefas. Regras:',
    '- Uma tarefa por ação concreta. Não invente tarefas que não estão no texto. No máximo 50.',
    '- Título curto e claro, começando pelo verbo quando fizer sentido. Mantenha nomes de eventos e pessoas como estão.',
    '- prazo: AAAA-MM-DD só se o texto indicar uma data ou dia (converta "sexta", "amanhã", "dia 20"). Se não houver, deixe vazio.',
    '- prioridade: Crítica para urgente ou P0, Alta para P1 ou importante, Baixa para P3 ou sem pressa, senão Média.',
    '- status: Não iniciado, a não ser que o texto diga que já está em andamento, travado ou feito.',
    '- responsavel: só se o texto disser quem faz e a pessoa estiver na equipe; use o nome como está na equipe. Senão, vazio.',
    '- grupo: o grupo do quadro que melhor combina (por exemplo pelo prazo, como "Esta semana" ou "Próxima semana"). Se nenhum combinar, vazio.',
    '- descricao: detalhes úteis do texto para aquela tarefa (links, observações, quantidades). Senão, vazio.',
  ].join('\n');
}

async function chamarGemini(modelo, sistema, texto) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': CHAVE() },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistema }] },
      contents: [{ role: 'user', parts: [{ text: texto }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: ESQUEMA },
    }),
    cache: 'no-store',
  });
  const corpo = await r.json().catch(() => ({}));
  return { status: r.status, corpo };
}

export async function sugerirTarefas({ setor: slug, texto }) {
  const perfil = await getPerfil();
  const setor = setorPorSlug(slug);
  if (!setor || !podeSetor(perfil, slug)) return { erro: 'Você não tem acesso a este setor.' };
  if (!CHAVE()) return { erro: 'A IA ainda não foi ligada. O administrador precisa colocar a GEMINI_API_KEY na Vercel.' };
  const t = String(texto || '').trim().slice(0, 15000);
  if (t.length < 3) return { erro: 'Cole ou escreva as tarefas no campo.' };

  const supabase = createClient();
  const [{ data: grupos }, { data: equipe }] = await Promise.all([
    supabase.from('tarefa_grupos').select('id, nome, ordem').eq('setor', slug).order('ordem').order('criado_em'),
    supabase.from('equipe').select('user_id, nome').order('nome'),
  ]);
  const hoje = hojeISO();
  const sistema = instrucoes({ setor, hoje, grupos: grupos || [], equipe: equipe || [] });

  let { status, corpo } = await chamarGemini(MODELO(), sistema, t);
  if (status === 404 && MODELO() !== MODELO_RESERVA) ({ status, corpo } = await chamarGemini(MODELO_RESERVA, sistema, t));

  if (status === 429) return { erro: 'A IA atingiu o limite de uso por agora. Tente de novo em 1 minuto.' };
  if (status === 400 || status === 403) {
    const msg = corpo?.error?.message || '';
    if (/api key/i.test(msg)) return { erro: 'A chave do Gemini (GEMINI_API_KEY) não é válida. Confira na Vercel.' };
    return { erro: 'O Gemini recusou o pedido: ' + (msg || 'erro ' + status) };
  }
  if (status !== 200) return { erro: 'O Gemini não respondeu agora (erro ' + status + '). Tente de novo.' };

  const bruto = (corpo?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  let lista;
  try {
    lista = JSON.parse(bruto).tarefas;
  } catch {
    return { erro: 'Não consegui entender a resposta da IA. Tente de novo ou escreva uma tarefa por linha.' };
  }
  if (!Array.isArray(lista) || !lista.length) return { erro: 'A IA não achou tarefas nesse texto.' };

  const gs = grupos || [];
  const tarefas = lista.slice(0, 50).map((x, i) => {
    const grupo = gs.find((g) => norm(g.nome) === norm(x.grupo)) || gs[0] || null;
    const pessoa = x.responsavel ? acharPessoa(x.responsavel, equipe || []) : null;
    return {
      chave: 'ia-' + i + '-' + Date.now(),
      titulo: String(x.titulo || '').trim().slice(0, 300),
      grupo_id: grupo?.id || '',
      prazo: x.prazo ? lerData(x.prazo, hoje) || '' : '',
      prioridade: lerPrioridade(x.prioridade) || 'Média',
      status: lerStatus(x.status) || 'Não iniciado',
      responsavel: pessoa?.user_id || '',
      descricao: String(x.descricao || '').trim().slice(0, 5000),
    };
  }).filter((x) => x.titulo);

  return { tarefas };
}

export async function criarTarefasEmLote({ setor: slug, tarefas }) {
  const perfil = await getPerfil();
  if (!setorPorSlug(slug) || !podeSetor(perfil, slug)) throw new Error('Você não tem acesso a este setor.');
  const lista = (Array.isArray(tarefas) ? tarefas : []).slice(0, 50);
  const agora = new Date().toISOString();
  const linhas = lista
    .map((t) => ({
      setor: slug,
      grupo_id: t.grupo_id || null,
      titulo: String(t.titulo || '').trim().slice(0, 300),
      descricao: String(t.descricao || '').trim().slice(0, 10000) || null,
      status: NOMES_STATUS.includes(t.status) ? t.status : 'Não iniciado',
      prioridade: NOMES_PRIORIDADE.includes(t.prioridade) ? t.prioridade : 'Média',
      prazo: /^\d{4}-\d{2}-\d{2}$/.test(t.prazo || '') ? t.prazo : null,
      responsavel: t.responsavel || null,
      concluida_em: t.status === 'Feito' ? agora : null,
    }))
    .filter((t) => t.titulo);
  if (!linhas.length) throw new Error('Nenhuma tarefa para criar.');

  const supabase = createClient();
  const { data, error } = await supabase.from('tarefas').insert(linhas).select('id');
  if (error) throw new Error(error.message);
  await supabase
    .from('tarefa_atividade')
    .insert((data || []).map((d) => ({ tarefa_id: d.id, autor_nome: perfil?.nome || 'Alguém', texto: 'criou a tarefa com IA' })));

  revalidatePath(`/setor/${slug}`);
  revalidatePath(`/setor/${slug}/painel`);
  revalidatePath('/minhas-tarefas');
  revalidatePath('/');
  return (data || []).length;
}
