// Compras do Financeiro: pipelines (CAUP geral, Ambição...) com colunas editáveis.
export const CORES_COLUNA = [
  { id: 'gray', nome: 'Cinza' },
  { id: 'amber', nome: 'Amarelo' },
  { id: 'blue', nome: 'Azul' },
  { id: 'violet', nome: 'Roxo' },
  { id: 'teal', nome: 'Turquesa' },
  { id: 'green', nome: 'Verde' },
  { id: 'coral', nome: 'Coral' },
];
export const corValida = (c) => (CORES_COLUNA.some((x) => x.id === c) ? c : 'gray');

// Colunas que um pipeline novo ganha quando a pessoa escolhe "usar as colunas padrão"
export const COLUNAS_PADRAO = [
  { nome: 'Aguardando 3 orçamentos', cor: 'amber' },
  { nome: 'Reunião', cor: 'blue' },
  { nome: 'Autorizado', cor: 'violet' },
  { nome: 'Comprando', cor: 'teal' },
  { nome: 'Finalizado', cor: 'green' },
];

export const fmtReal = (v) => (v === null || v === undefined || v === '' ? '' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
