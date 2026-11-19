// Eventos: checklist de cada setor por evento.
import { hojeISO } from './tarefas';

export const SETORES_EVENTO = ['vendas', 'marketing', 'eventos', 'financeiro'];

export const TIPOS_EVENTO = ['GI', 'GC', 'MGA', 'Ambição', 'Sniper', 'Máquina de Vendas', 'Ponto de Virada', 'Ela Lidera', 'Sala Secreta', 'Alavanca', 'Podcast', 'Interno', 'Outro'];

// Briefing do evento (o que todo mundo precisa saber antes)
export const CAMPOS_BRIEFING = [
  { id: 'objetivo', nome: 'Objetivo do evento', dica: 'Ex.: vender o Ambição para os alunos do GC' },
  { id: 'publico', nome: 'Público e meta', dica: 'Quem vem, quantas pessoas, meta de vendas' },
  { id: 'oferta', nome: 'Oferta e pitch', dica: 'O que vamos vender, condição, quem faz o pitch' },
  { id: 'palestrantes', nome: 'Palestrantes e quem conduz', dica: 'Quem sobe no palco, quem abre e encerra' },
  { id: 'programacao', nome: 'Programação do dia', dica: '9h credenciamento, 9h30 abertura...' },
  { id: 'estrutura', nome: 'Estrutura e logística', dica: 'Sala, coffee, almoço, materiais, fornecedores' },
  { id: 'links', nome: 'Links', dica: 'Sympla, grupo de WhatsApp, pasta do Drive' },
  { id: 'observacoes', nome: 'Observações', dica: 'Pontos de atenção' },
];

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const nomeMes = (iso) => {
  const [a, m] = iso.split('-');
  const mes = MESES[Number(m) - 1];
  return `${mes[0].toUpperCase()}${mes.slice(1)} de ${a}`;
};
export const diaSemana = (iso) => SEMANA[new Date(iso + 'T12:00:00Z').getUTCDay()];

// Checklist que entra sozinho em todo evento novo (dá para tirar e acrescentar itens depois)
export const CHECKLIST_PADRAO = {
  vendas: [
    'Definir meta de vendas do evento',
    'Separar a lista de leads e o ICP',
    'Ligações de convite',
    'Ligações de confirmação (D-2 e D-1)',
    'Pitch e oferta do evento alinhados',
    'Material e condições para o time comercial',
    'Atendimento e fechamentos no dia',
    'Follow-up de quem não fechou no evento',
  ],
  marketing: [
    'Identidade visual do evento',
    'Página de inscrição / Sympla',
    'Criativos de tráfego pago',
    'Conteúdo orgânico (antecipação)',
    'Grupo de WhatsApp e mensagem de boas-vindas',
    'Trilha de conteúdo do grupo',
    'Disparos: convite, faltam 2 dias, é amanhã, é hoje',
    'Fotos e vídeos no dia',
    'Pós-evento: aftermovie e depoimentos',
  ],
  eventos: [
    'Local e data confirmados',
    'Sala montada (cadeiras, palco, decoração)',
    'Som, telão e internet testados',
    'Palestrantes confirmados e roteiro do dia',
    'Coffee break e almoço',
    'Credenciamento e lista de presença',
    'Materiais impressos e brindes',
    'Checklist da sala no dia',
  ],
  financeiro: [
    'Orçamento do evento aprovado',
    'Pagamento de fornecedores (buffet, local, equipamentos)',
    'Links de pagamento e maquininha prontos',
    'Conferência das vendas do evento',
    'Relatório de resultado (receita x custo)',
  ],
};

export const ESTADOS_ITEM = {
  pendente: { nome: 'Pendente', cor: 'gray' },
  feito: { nome: 'Feito', cor: 'green' },
  faltou: { nome: 'Faltou', cor: 'coral' },
};

export function resumoItens(itens) {
  const total = itens.length;
  const feitos = itens.filter((i) => i.estado === 'feito').length;
  const faltou = itens.filter((i) => i.estado === 'faltou').length;
  const pendentes = total - feitos - faltou;
  return { total, feitos, faltou, pendentes, pct: total ? Math.round((feitos / total) * 100) : 0 };
}

// Antes, durante ou depois do evento
export function momentoEvento(ev, hoje = hojeISO()) {
  const ini = ev.data_inicio;
  const fim = ev.data_fim || ev.data_inicio;
  if (!ini) return { nome: 'Sem data', cor: 'gray', dias: null };
  if (hoje < ini) {
    const dias = Math.round((new Date(ini + 'T12:00:00Z') - new Date(hoje + 'T12:00:00Z')) / 86400000);
    return { nome: dias === 1 ? 'Amanhã' : `Faltam ${dias} dias`, cor: dias <= 7 ? 'amber' : 'gray', dias };
  }
  if (hoje <= fim) return { nome: 'Acontecendo', cor: 'green', dias: 0 };
  return { nome: 'Realizado', cor: 'gray', dias: -1 };
}

export function fmtPeriodo(ev) {
  const f = (d) => d.split('-').reverse().slice(0, 2).join('/');
  if (!ev.data_inicio) return 'Sem data';
  if (ev.data_fim && ev.data_fim !== ev.data_inicio) return `${f(ev.data_inicio)} a ${f(ev.data_fim)}`;
  return f(ev.data_inicio) + '/' + ev.data_inicio.slice(0, 4);
}
