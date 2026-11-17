// RH: competências avaliadas e tipos de reunião.

export const COMPETENCIAS = [
  'Entrega de resultados',
  'Comunicação',
  'Trabalho em equipe',
  'Proatividade',
  'Organização',
  'Alinhamento com a cultura',
];

export const TIPOS_REUNIAO = ['1:1', 'Equipe', 'Feedback', 'Alinhamento', 'Liderança'];

export const AREAS_RH = ['Diretoria', 'Sucesso do Cliente', 'Marketing', 'Vendas', 'Eventos', 'Financeiro', 'RH', 'Administrativo'];

export function mediaNotas(notas) {
  const v = Object.values(notas || {}).map(Number).filter((n) => n >= 1 && n <= 5);
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
}

// Monta a árvore do organograma a partir de "quem reporta a quem"
export function montarArvore(pessoas) {
  const filhos = {};
  const ids = new Set(pessoas.map((p) => p.id));
  pessoas.forEach((p) => {
    const pai = p.gestor_id && ids.has(p.gestor_id) && p.gestor_id !== p.id ? p.gestor_id : 'raiz';
    (filhos[pai] = filhos[pai] || []).push(p);
  });
  Object.values(filhos).forEach((l) => l.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)));
  const visitado = new Set();
  const no = (p) => {
    if (visitado.has(p.id)) return null; // evita volta infinita se alguém reportar a um subordinado
    visitado.add(p.id);
    return { ...p, filhos: (filhos[p.id] || []).map(no).filter(Boolean) };
  };
  return (filhos.raiz || []).map(no).filter(Boolean);
}
