// Regras e cores do módulo de tarefas (estilo Monday).

export const STATUS = [
  { nome: 'Não iniciado', bg: '#2B3830', fg: '#C5CFC9' },
  { nome: 'Em andamento', bg: '#F5B84A', fg: '#2A1C00' },
  { nome: 'Travado', bg: '#F0866E', fg: '#2A0D06' },
  { nome: 'Feito', bg: '#62CC74', fg: '#07150B' },
];

export const PRIORIDADES = [
  { nome: 'Baixa', bg: '#26312B', fg: '#C5CFC9' },
  { nome: 'Média', bg: '#4FC3C0', fg: '#06201F' },
  { nome: 'Alta', bg: '#6AA8F7', fg: '#06182E' },
  { nome: 'Crítica', bg: '#B08CF5', fg: '#1A0E33' },
];

export const CORES_GRUPO = {
  green: '#62CC74',
  blue: '#6AA8F7',
  violet: '#B08CF5',
  amber: '#F5B84A',
  coral: '#F0866E',
  teal: '#4FC3C0',
  gray: '#94A39A',
};

export const NOMES_STATUS = STATUS.map((s) => s.nome);
export const NOMES_PRIORIDADE = PRIORIDADES.map((p) => p.nome);

export function corStatus(nome) {
  return STATUS.find((s) => s.nome === nome) || STATUS[0];
}

export function corPrioridade(nome) {
  return PRIORIDADES.find((p) => p.nome === nome) || PRIORIDADES[1];
}

// Data de hoje no horário de Brasília, no formato AAAA-MM-DD
export function hojeISO(agora = new Date()) {
  return agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export function somarDias(iso, dias) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function atrasada(t, hoje) {
  return !!t.prazo && t.prazo < hoje && t.status !== 'Feito';
}

export function fmtPrazo(iso, hoje) {
  if (!iso) return '';
  if (hoje) {
    if (iso === hoje) return 'Hoje';
    if (iso === somarDias(hoje, 1)) return 'Amanhã';
    if (iso === somarDias(hoje, -1)) return 'Ontem';
  }
  const [a, m, d] = iso.split('-');
  return hoje && a !== hoje.slice(0, 4) ? `${d}/${m}/${a.slice(2)}` : `${d}/${m}`;
}

export function fmtQuando(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }) +
    ' às ' +
    d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  );
}

// Separa as tarefas de uma pessoa por prazo (tela "Minhas tarefas")
export function separarPorPrazo(tarefas, hoje) {
  const fimSemana = somarDias(hoje, 6);
  const abertas = tarefas.filter((t) => t.status !== 'Feito');
  return [
    { nome: 'Atrasadas', cor: '#F0866E', itens: abertas.filter((t) => t.prazo && t.prazo < hoje) },
    { nome: 'Hoje', cor: '#F5B84A', itens: abertas.filter((t) => t.prazo === hoje) },
    { nome: 'Próximos 7 dias', cor: '#62CC74', itens: abertas.filter((t) => t.prazo && t.prazo > hoje && t.prazo <= fimSemana) },
    { nome: 'Mais adiante', cor: '#6AA8F7', itens: abertas.filter((t) => t.prazo && t.prazo > fimSemana) },
    { nome: 'Sem prazo', cor: '#94A39A', itens: abertas.filter((t) => !t.prazo) },
  ];
}
