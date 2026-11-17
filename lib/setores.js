// Setores da Central da Empresa. O "slug" é o que fica gravado no banco.
export const SETORES = [
  { slug: 'sucesso', icone: 'coracao', nome: 'Sucesso do Cliente', sigla: 'SC', cor: 'violet', desc: 'Onboarding, encontros, dossiê, assessment e cashback dos clientes.' },
  { slug: 'marketing', icone: 'megafone', nome: 'Marketing', sigla: 'MK', cor: 'green', desc: 'Tarefas do time de marketing. Painel com os números das campanhas em breve.' },
  { slug: 'vendas', icone: 'alvo', nome: 'Vendas', sigla: 'VD', cor: 'blue', desc: 'Tarefas do comercial. Painel do CRM em breve.' },
  { slug: 'eventos', icone: 'ingresso', nome: 'Eventos', sigla: 'EV', cor: 'amber', desc: 'Checklist de cada setor por evento, avaliação e tarefas do time de eventos.', extras: [{ href: '/eventos', nome: 'Eventos e checklists' }] },
  { slug: 'financeiro', icone: 'carteira', nome: 'Financeiro', sigla: 'FN', cor: 'coral', desc: 'Tarefas do financeiro. Dados do CRM em breve. Acesso restrito.' },
  {
    slug: 'rh', icone: 'organograma', nome: 'RH', sigla: 'RH', cor: 'teal', desc: 'Organograma da empresa, avaliações de desempenho e reuniões do time.',
    extras: [{ href: '/rh/organograma', nome: 'Organograma' }, { href: '/rh/avaliacoes', nome: 'Avaliações' }, { href: '/rh/reunioes', nome: 'Reuniões' }],
  },
];

export const SLUGS = SETORES.map((s) => s.slug);

export function setorPorSlug(slug) {
  return SETORES.find((s) => s.slug === slug) || null;
}

// Telas do Sucesso do Cliente (o que já existia na Central do Cliente)
export const NAV_SUCESSO = [
  { href: '/sucesso', nome: 'Painel' },
  { href: '/onboarding', nome: 'Onboarding' },
  { href: '/encontros', nome: 'Encontros e presença' },
  { href: '/assessment', nome: 'Assessment' },
  { href: '/cashback', nome: 'Cashback' },
  { href: '/treinamentos', nome: 'Área do aluno' },
  { href: '/setor/sucesso', nome: 'Tarefas' },
  { href: '/clientes/novo', nome: '+ Novo cliente' },
];

export const ROTAS_SUCESSO = ['/sucesso', '/onboarding', '/encontros', '/assessment', '/cashback', '/treinamentos', '/clientes', '/setor/sucesso'];
