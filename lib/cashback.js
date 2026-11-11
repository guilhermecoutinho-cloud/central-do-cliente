// Regras do cashback e da gamificação.
// Os valores e níveis abaixo são EXEMPLOS: troque pelos que a Capital Upgrade definir.

// Níveis pelo total de cashback já ganho (não diminui quando o cliente resgata).
export const NIVEIS = [
  { nome: 'Bronze', min: 0, cor: 'coral' },
  { nome: 'Prata', min: 500, cor: 'blue' },
  { nome: 'Ouro', min: 2000, cor: 'amber' },
  { nome: 'Diamante', min: 5000, cor: 'violet' },
];

// Motivos prontos para dar cashback. "valor" é só a sugestão que já vem preenchida.
export const MOTIVOS = [
  { categoria: 'Indicação', valor: 500, desc: 'Indicou alguém que fechou com a CAUP' },
  { categoria: 'Renovação', valor: 300, desc: 'Renovou o produto' },
  { categoria: 'Presença', valor: 50, desc: 'Participou do encontro' },
  { categoria: 'Depoimento', valor: 150, desc: 'Gravou depoimento em vídeo' },
  { categoria: 'Desafio', valor: 100, desc: 'Cumpriu um desafio ou tarefa da mentoria' },
  { categoria: 'Outro', valor: 0, desc: 'Outro motivo' },
];

export const CATEGORIAS = MOTIVOS.map((m) => m.categoria);

export const COR_CATEGORIA = {
  'Indicação': 'green',
  'Renovação': 'violet',
  Presença: 'blue',
  Depoimento: 'coral',
  Desafio: 'amber',
  Outro: 'gray',
  Resgate: 'teal',
};

export function nivelDe(totalGanho = 0) {
  const total = Number(totalGanho) || 0;
  let atual = NIVEIS[0];
  for (const n of NIVEIS) if (total >= n.min) atual = n;
  const idx = NIVEIS.indexOf(atual);
  const proximo = NIVEIS[idx + 1] || null;
  const falta = proximo ? Math.max(proximo.min - total, 0) : 0;
  const pct = proximo ? Math.min(100, Math.floor(((total - atual.min) / (proximo.min - atual.min)) * 100)) : 100;
  return { atual, proximo, falta, pct };
}

export function fmtMoeda(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Aceita "1.234,56", "1234.56", "R$ 150" etc.
export function lerValor(texto) {
  if (texto === null || texto === undefined) return NaN;
  let t = String(texto).replace(/R\$|\s/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ''); // 1.500 = mil e quinhentos
  return Math.round(parseFloat(t) * 100) / 100;
}

// Conquistas calculadas a partir do que o cliente já fez.
export function conquistasDe({ cliente, resumoEnc, movimentos, saldo }) {
  const cats = new Set(movimentos.filter((m) => m.tipo === 'credito').map((m) => m.categoria));
  const nivel = nivelDe(saldo?.total_ganho);
  return [
    { nome: 'Onboarding concluído', desc: 'Passou por todas as etapas', ok: cliente.status === 'ativo' },
    { nome: 'Presença perfeita', desc: 'Não faltou em nenhum encontro (mínimo 2)', ok: resumoEnc.usados >= 2 && resumoEnc.faltou === 0 && resumoEnc.participou === resumoEnc.usados },
    { nome: 'Embaixador', desc: 'Fez uma indicação que fechou', ok: cats.has('Indicação') },
    { nome: 'Fiel', desc: 'Renovou o produto', ok: cats.has('Renovação') },
    { nome: 'Voz da CAUP', desc: 'Gravou depoimento', ok: cats.has('Depoimento') },
    { nome: `Nível ${NIVEIS[2].nome}`, desc: `Chegou a ${fmtMoeda(NIVEIS[2].min)} ganhos`, ok: NIVEIS.indexOf(nivel.atual) >= 2 },
  ];
}
