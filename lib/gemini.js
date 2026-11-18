// Chamada ao Gemini (Google) usada pelo "Criar com IA" e pelo "Importar calendário".
// Tenta o modelo configurado e, se ele falhar (sumiu, caiu, demorou ou estourou o limite), tenta os reservas.

const CHAVE = () => (process.env.GEMINI_API_KEY || '').trim();

// Os "-latest" são apelidos que o Google mantém sempre apontando para o modelo atual
const RESERVAS = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-2.5-flash'];
const ESPERA_MS = 25000; // por modelo
const LIMITE_TOTAL_MS = 48000; // a Vercel corta a ação em 60s

export const geminiLigado = () => Boolean(CHAVE());

function modelos() {
  const escolhido = (process.env.GEMINI_MODELO || '').trim();
  return [...new Set([escolhido, ...RESERVAS].filter(Boolean))];
}

async function tentar(modelo, corpo, espera) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), espera);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': CHAVE() },
      body: JSON.stringify(corpo),
      cache: 'no-store',
      signal: ctl.signal,
    });
    const json = await r.json().catch(() => ({}));
    return { status: r.status, json };
  } catch (e) {
    return { status: e?.name === 'AbortError' ? 408 : 0, json: { error: { message: e?.message || 'sem resposta' } } };
  } finally {
    clearTimeout(timer);
  }
}

// Devolve { texto } com a resposta (JSON em texto) ou { erro } com uma mensagem para a pessoa
export async function perguntarGemini({ sistema, partes, esquema, temperatura = 0.2 }) {
  if (!CHAVE()) return { erro: 'A IA ainda não foi ligada. O administrador precisa colocar a GEMINI_API_KEY na Vercel.' };
  const corpo = {
    systemInstruction: { parts: [{ text: sistema }] },
    contents: [{ role: 'user', parts: partes }],
    generationConfig: { temperature: temperatura, responseMimeType: 'application/json', responseSchema: esquema },
  };

  let ultimo = null;
  const inicio = Date.now();
  for (const modelo of modelos()) {
    const resta = LIMITE_TOTAL_MS - (Date.now() - inicio);
    if (resta < 4000) break;
    const { status, json } = await tentar(modelo, corpo, Math.min(ESPERA_MS, resta));
    if (status === 200) {
      const texto = (json?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
      if (texto) return { texto, modelo };
      ultimo = { status, msg: json?.candidates?.[0]?.finishReason ? 'resposta vazia (' + json.candidates[0].finishReason + ')' : 'resposta vazia' };
      continue;
    }
    const msg = json?.error?.message || '';
    console.error(`[gemini] ${modelo} respondeu ${status}: ${msg.slice(0, 300)}`);
    // Chave errada ou bloqueada: nenhum outro modelo vai funcionar
    if ((status === 400 || status === 403) && /api key|permission|billing/i.test(msg)) {
      return { erro: 'A chave do Gemini (GEMINI_API_KEY) não está funcionando: ' + msg.slice(0, 160) };
    }
    // Pedido inválido (não é o modelo): para aqui e mostra o motivo
    if (status === 400 && !/model|not found|not supported/i.test(msg)) {
      return { erro: 'O Gemini recusou o pedido: ' + msg.slice(0, 200) };
    }
    ultimo = { status, msg };
  }

  if (ultimo?.status === 429) return { erro: 'A IA atingiu o limite de uso por agora. Tente de novo em 1 minuto.' };
  if (ultimo?.status === 408) return { erro: 'A IA demorou demais para responder. Tente de novo (textos menores respondem mais rápido).' };
  return { erro: 'A IA não respondeu agora (' + (ultimo?.status || 'sem conexão') + (ultimo?.msg ? ': ' + ultimo.msg.slice(0, 160) : '') + '). Tente de novo.' };
}
