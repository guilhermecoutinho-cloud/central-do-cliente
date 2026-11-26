// Constantes e contas da área do aluno (conexões e NPS).

export const TIPOS_CONEXAO = [
  { tipo: 'fornecedor', nome: 'Fornecedores', um: 'Fornecedor', desc: 'Empresas que vendem produtos e serviços para outras empresas.' },
  { tipo: 'cliente', nome: 'Clientes', um: 'Cliente', desc: 'Empresas que estão procurando fornecedores e serviços.' },
  { tipo: 'parceiro', nome: 'Parceiros estratégicos', um: 'Parceiro estratégico', desc: 'Parcerias, indicações e projetos em conjunto.' },
];

export const tipoConexao = (t) => TIPOS_CONEXAO.find((x) => x.tipo === t) || TIPOS_CONEXAO[0];

// NPS = % promotores (9 e 10) − % detratores (0 a 6). Usa só a resposta mais recente de cada pessoa.
export function calcNps(respostas) {
  const ultimas = new Map();
  [...respostas]
    .sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1))
    .forEach((r) => {
      if (!ultimas.has(r.membro_id)) ultimas.set(r.membro_id, r);
    });
  const lista = [...ultimas.values()];
  const total = lista.length;
  const promotores = lista.filter((r) => r.nota >= 9).length;
  const detratores = lista.filter((r) => r.nota <= 6).length;
  const neutros = total - promotores - detratores;
  const nps = total ? Math.round(((promotores - detratores) / total) * 100) : null;
  const media = total ? Math.round((lista.reduce((s, r) => s + r.nota, 0) / total) * 10) / 10 : null;
  return { nps, media, total, promotores, neutros, detratores, ultimas: lista };
}

export function zonaNps(nps) {
  if (nps === null) return { nome: 'Sem respostas', cor: 'gray' };
  if (nps >= 75) return { nome: 'Excelência', cor: 'green' };
  if (nps >= 50) return { nome: 'Qualidade', cor: 'green' };
  if (nps >= 0) return { nome: 'Aperfeiçoamento', cor: 'amber' };
  return { nome: 'Crítico', cor: 'coral' };
}

export function linkWhatsApp(numero) {
  let d = String(numero || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length <= 11) d = '55' + d;
  return 'https://wa.me/' + d;
}

// ---------------------------------------------------------------- Ficha do aluno

export const FAIXAS_FATURAMENTO = [
  'Até R$ 500 mil por ano',
  'R$ 500 mil a R$ 1 milhão por ano',
  'R$ 1 a 5 milhões por ano',
  'R$ 5 a 10 milhões por ano',
  'R$ 10 a 30 milhões por ano',
  'R$ 30 a 50 milhões por ano',
  'Acima de R$ 50 milhões por ano',
];

export const STATUS_INDICACAO = [
  { nome: 'Indicado', cor: 'gray' },
  { nome: 'Em negociação', cor: 'amber' },
  { nome: 'Fechou', cor: 'green' },
  { nome: 'Não fechou', cor: 'coral' },
];
export const corIndicacao = (s) => STATUS_INDICACAO.find((x) => x.nome === s)?.cor || 'gray';

// Idade a partir da data de nascimento (AAAA-MM-DD)
export function idade(nascimento, hoje = new Date()) {
  if (!nascimento) return null;
  const [a, m, d] = nascimento.split('-').map(Number);
  let anos = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) anos--;
  return anos >= 0 && anos < 120 ? anos : null;
}
