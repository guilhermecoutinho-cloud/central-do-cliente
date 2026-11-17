// Calendário de conteúdo do Marketing (social mídia): semanas, datas e o padrão da casa.

export const PADRAO = {
  titulo: 'Calendário de conteúdo',
  subtitulo: 'Marketing · Orgânico',
  funil: ['Chamada', 'Prova social', 'Contagem regressiva', 'Cobertura ao vivo', 'Cortes e depoimentos', 'Prova do próximo evento'],
  regras: [
    { rotulo: 'Por semana', texto: '2 Reels + 2 carrosséis' },
    { rotulo: 'Stories', texto: 'todo dia, 5 a 8 telas com enquete, caixinha ou link' },
    { rotulo: 'Todo post', texto: 'termina com palavra-chave no ManyChat → Funil Digital' },
  ],
};

export const FORMATOS = ['Reel', 'Reels', 'Carrossel', 'Stories', 'Stories + Reel', 'Stories + Reels', 'Reel + Stories', 'Stories + Carrossel', 'Carrossel + Stories', 'Reel collab', 'Post', 'Anúncio', 'Live'];

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const ehData = (s) => ISO.test(String(s || ''));

// Datas sem fuso: trabalha tudo em UTC ao meio-dia para não "pular" de dia
const d = (iso) => new Date(iso + 'T12:00:00Z');
const iso = (dt) => dt.toISOString().slice(0, 10);
export const somarDias = (s, n) => {
  const x = d(s);
  x.setUTCDate(x.getUTCDate() + n);
  return iso(x);
};
export const diasEntre = (a, b) => Math.round((d(b) - d(a)) / 86400000);

// "17/11"
export const ddmm = (s) => (ehData(s) ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '');
// "07–08/12", "30/11–02/12" ou "17/11"
export function periodo(ini, fim) {
  if (!ehData(fim) || fim === ini) return ddmm(ini);
  if (ini.slice(5, 7) === fim.slice(5, 7)) return `${ini.slice(8, 10)}–${ddmm(fim)}`;
  return `${ddmm(ini)}–${ddmm(fim)}`;
}

// Semanas de 7 dias a partir do início do calendário (a última vai só até o fim)
export function semanas(inicio, fim) {
  const lista = [];
  if (!ehData(inicio) || !ehData(fim)) return lista;
  for (let a = inicio; a <= fim && lista.length < 12; a = somarDias(a, 7)) {
    const b = somarDias(a, 6) < fim ? somarDias(a, 6) : fim;
    lista.push({ inicio: a, fim: b, rotulo: periodo(a, b) });
  }
  return lista;
}

// Em qual semana cai um post (antes do início vai para a primeira; depois do fim, para a última)
export function semanaDoPost(data, lista) {
  if (!lista.length) return -1;
  const i = lista.findIndex((s) => data >= s.inicio && data <= s.fim);
  if (i >= 0) return i;
  return data < lista[0].inicio ? 0 : lista.length - 1;
}

// Campanhas que mais aparecem na semana (quando ninguém escreveu o rótulo da semana)
export function campanhasDaSemana(posts) {
  const conta = new Map();
  posts.forEach((p) => {
    String(p.campanha || '')
      .split('→')
      .map((c) => c.trim())
      .filter(Boolean)
      .forEach((c) => conta.set(c, (conta.get(c) || 0) + 1));
  });
  return [...conta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c).join(' · ');
}

// Post vale para o dia? (considera "07–08/12")
export const postNoDia = (p, dia) => p.data === dia || (p.data_fim && p.data <= dia && p.data_fim >= dia);

// Próximo calendário com o mesmo padrão: começa no dia seguinte e tem a mesma duração
export function proximoPeriodo(cal) {
  const dur = Math.max(6, diasEntre(cal.inicio, cal.fim));
  const inicio = somarDias(cal.fim, 1);
  return { inicio, fim: somarDias(inicio, dur) };
}

// ---------------------------------------------------------------- Entrada (formulário, IA e Claude)

const txt = (v, max) => String(v ?? '').trim().slice(0, max);

// Aceita "2026-11-17", "17/11", "17/11/2026" (ano: o mais perto do início do calendário ou de hoje)
export function lerData(v, referencia) {
  const s = String(v || '').trim();
  if (ehData(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (!m) return null;
  const dia = m[1].padStart(2, '0');
  const mes = m[2].padStart(2, '0');
  if (m[3]) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${mes}-${dia}`;
  const ano = Number(String(referencia || '').slice(0, 4)) || new Date().getUTCFullYear();
  const candidatos = [ano - 1, ano, ano + 1].map((a) => `${a}-${mes}-${dia}`);
  const ref = ehData(referencia) ? referencia : iso(new Date());
  return candidatos.sort((a, b) => Math.abs(diasEntre(ref, a)) - Math.abs(diasEntre(ref, b)))[0];
}

// Deixa um calendário (vindo da IA, do Claude ou do formulário) pronto para gravar
export function normalizarCalendario(e, hoje) {
  const posts = (Array.isArray(e?.posts) ? e.posts : [])
    .map((p, i) => {
      const data = lerData(p.data, e?.inicio || hoje);
      if (!data) return null;
      const fim = lerData(p.data_fim, data);
      return {
        data,
        data_fim: fim && fim > data ? fim : null,
        campanha: txt(p.campanha, 60) || null,
        descricao: txt(p.descricao || p.titulo, 400),
        formato: txt(p.formato, 60) || null,
        link: txt(p.link, 600) || null,
        ordem: i + 1,
      };
    })
    .filter((p) => p && p.descricao)
    .slice(0, 200);

  let inicio = lerData(e?.inicio, hoje);
  let fim = lerData(e?.fim, inicio || hoje);
  const datas = posts.flatMap((p) => [p.data, p.data_fim].filter(Boolean)).sort();
  if (!inicio) inicio = datas[0] || hoje;
  if (!fim || fim < inicio) fim = datas[datas.length - 1] && datas[datas.length - 1] > inicio ? datas[datas.length - 1] : somarDias(inicio, 34);

  const funil = (Array.isArray(e?.funil) ? e.funil : []).map((f) => txt(f, 40)).filter(Boolean).slice(0, 8);
  const regras = (Array.isArray(e?.regras) ? e.regras : [])
    .map((r) => ({ rotulo: txt(r?.rotulo, 30), texto: txt(r?.texto, 160) }))
    .filter((r) => r.rotulo && r.texto)
    .slice(0, 5);
  const eventos = (Array.isArray(e?.eventos) ? e.eventos : [])
    .map((x) => ({ nome: txt(x?.nome, 30), datas: txt(x?.datas, 30) }))
    .filter((x) => x.nome)
    .slice(0, 8);
  const sem = {};
  (Array.isArray(e?.semanas) ? e.semanas : []).forEach((s) => {
    const a = lerData(s?.inicio, inicio);
    if (a && txt(s?.rotulo, 80)) sem[a] = txt(s.rotulo, 80);
  });

  return {
    calendario: {
      titulo: txt(e?.titulo, 80) || PADRAO.titulo,
      subtitulo: txt(e?.subtitulo, 80) || PADRAO.subtitulo,
      inicio,
      fim,
      funil: funil.length ? funil : PADRAO.funil,
      regras: regras.length ? regras : PADRAO.regras,
      eventos,
      semanas: sem,
      nota: txt(e?.nota, 600) || null,
    },
    posts,
  };
}

// Formato que a IA (Gemini) e o Claude devolvem
export const ESQUEMA_CALENDARIO = {
  type: 'OBJECT',
  properties: {
    titulo: { type: 'STRING' },
    subtitulo: { type: 'STRING' },
    inicio: { type: 'STRING', description: 'AAAA-MM-DD' },
    fim: { type: 'STRING', description: 'AAAA-MM-DD' },
    funil: { type: 'ARRAY', items: { type: 'STRING' } },
    regras: { type: 'ARRAY', items: { type: 'OBJECT', properties: { rotulo: { type: 'STRING' }, texto: { type: 'STRING' } } } },
    eventos: { type: 'ARRAY', items: { type: 'OBJECT', properties: { nome: { type: 'STRING' }, datas: { type: 'STRING' } } } },
    semanas: { type: 'ARRAY', items: { type: 'OBJECT', properties: { inicio: { type: 'STRING' }, rotulo: { type: 'STRING' } } } },
    nota: { type: 'STRING' },
    posts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          data: { type: 'STRING', description: 'AAAA-MM-DD' },
          data_fim: { type: 'STRING', description: 'AAAA-MM-DD, só quando o post vale para vários dias' },
          campanha: { type: 'STRING' },
          descricao: { type: 'STRING' },
          formato: { type: 'STRING' },
        },
        required: ['data', 'descricao'],
      },
    },
  },
  required: ['posts'],
};

export function instrucoesCalendario(hoje) {
  return [
    'Você monta o calendário de conteúdo do Instagram da Capital Upgrade (CAUP), empresa de treinamentos e eventos empresariais.',
    `Hoje é ${hoje} (horário de Brasília).`,
    'A pessoa manda um calendário (texto, tabela ou imagem). Copie fielmente, sem inventar posts. Regras:',
    '- posts: um item por card/linha. data em AAAA-MM-DD (deduza o ano pelo de hoje: datas de meses à frente são do ano certo). Se o card vale para vários dias (ex.: "07–08/12"), use data e data_fim.',
    '- campanha: o rótulo do card (ex.: GC, Podcast, Black, Alavanca, GI, Ela Lidera). descricao: o texto do card. formato: a etiqueta (Reel, Carrossel, Stories + Reels...).',
    '- inicio e fim: o período do calendário (primeiro e último dia).',
    '- funil: as etapas em sequência, se houver (ex.: Chamada, Prova social...). regras: linhas como "Por semana: 2 Reels" viram {rotulo, texto}.',
    '- semanas: o rótulo escrito embaixo de cada semana (ex.: "GC · Podcast · Black"), com o primeiro dia da semana em inicio.',
    '- eventos: os quadros de eventos do rodapé ({nome, datas}). nota: o texto solto do rodapé.',
    '- Mantenha a escrita em português como está, com acentos.',
  ].join('\n');
}
