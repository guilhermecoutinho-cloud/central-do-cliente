// Compras do Financeiro: etapas do quadro.
export const ETAPAS_COMPRA = [
  { id: 'orcamentos', nome: 'Aguardando 3 orçamentos', cor: 'amber' },
  { id: 'reuniao', nome: 'Reunião', cor: 'blue' },
  { id: 'autorizado', nome: 'Autorizado', cor: 'violet' },
  { id: 'comprando', nome: 'Comprando', cor: 'teal' },
  { id: 'finalizado', nome: 'Finalizado', cor: 'green' },
];
export const etapaCompra = (id) => ETAPAS_COMPRA.find((e) => e.id === id) || ETAPAS_COMPRA[0];
export const fmtReal = (v) => (v === null || v === undefined || v === '' ? '' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
