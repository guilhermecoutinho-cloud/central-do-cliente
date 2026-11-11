export const PRODUTOS = ['MGA', 'Ambição', 'Mentoria', 'Imersão'];

// cor de cada produto (classe CSS t-<cor>)
export const COR_PRODUTO = {
  MGA: 'green',
  'Ambição': 'amber',
  Mentoria: 'blue',
  'Imersão': 'violet',
};

export const CORES_AVATAR = ['blue', 'violet', 'coral', 'amber', 'green', 'teal'];

export const STATUS = {
  onboarding: { nome: 'Em onboarding', cor: 'violet' },
  ativo: { nome: 'Ativo', cor: 'green' },
  encerrado: { nome: 'Encerrado', cor: 'gray' },
};

export const PERFIS = [
  'Ideal',
  'Participativo',
  'Resultados e nada mais',
  'Ansioso',
  'Enrolado',
  'Ausente fiel',
  'Ausente total',
];

export const SETORES = ['Geral', 'Financeiro', 'Vendas', 'Marketing', 'Sucesso do Cliente'];

export const COR_SETOR = {
  Geral: 'green',
  Financeiro: 'amber',
  Vendas: 'blue',
  Marketing: 'coral',
  'Sucesso do Cliente': 'violet',
};

export function iniciais(nome = '') {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function corAvatar(texto = '') {
  let soma = 0;
  for (const ch of texto) soma += ch.charCodeAt(0);
  return CORES_AVATAR[soma % CORES_AVATAR.length];
}

const TZ = 'America/Sao_Paulo';

export function fmtData(valor) {
  if (!valor) return '—';
  const d = typeof valor === 'string' && valor.length === 10 ? new Date(valor + 'T12:00:00-03:00') : new Date(valor);
  return d.toLocaleDateString('pt-BR', { timeZone: TZ });
}

export function fmtDataHora(valor) {
  if (!valor) return '—';
  const d = new Date(valor);
  return (
    d.toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' }) +
    ' às ' +
    d.toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  );
}

export function fmtTamanho(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
}

export function texto(formData, campo) {
  const v = formData.get(campo);
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
}
