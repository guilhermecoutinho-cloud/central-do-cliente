import { createClient } from '@/lib/supabase/server';
import { hojeISO } from '@/lib/tarefas';
import Quadro from './Quadro';

// Carrega o quadro de tarefas de um setor. Com "secao", mostra só os grupos daquela seção
// (ex.: Financeiro > Pagamentos / Faturamento). Sem seção, mostra os grupos gerais do setor.
export default async function QuadroServidor({ setor, secao = null, titulo = null, visao = 'tabela', separarSecoes = false }) {
  const supabase = createClient();

  let consultaGrupos = supabase.from('tarefa_grupos').select('id, nome, cor, ordem').eq('setor', setor.slug);
  if (secao) consultaGrupos = consultaGrupos.eq('secao', secao);
  else if (separarSecoes) consultaGrupos = consultaGrupos.is('secao', null);
  let { data: grupos, error } = await consultaGrupos.order('ordem').order('criado_em');
  if (error && !secao) {
    // A coluna "secao" ainda não existe (SQL não rodou): mostra todos os grupos
    ({ data: grupos, error } = await supabase.from('tarefa_grupos').select('id, nome, cor, ordem').eq('setor', setor.slug).order('ordem').order('criado_em'));
  }
  if (error) {
    return <div className="aviso t-amber">Falta ativar as seções do financeiro: rode o arquivo supabase/financeiro-compras.sql no SQL Editor do Supabase.</div>;
  }

  const ids = (grupos || []).map((g) => g.id);
  const CAMPOS = 'id, titulo, status, prioridade, responsavel, prazo, grupo_id, criado_em, tarefa_subtarefas(feito), tarefa_atualizacoes(count)';
  const buscar = (campos) => supabase.from('tarefas').select(campos).eq('setor', setor.slug).in('grupo_id', ids).order('criado_em');
  let [{ data: tarefas, error: eTarefas }, { data: equipe }] = await Promise.all([
    ids.length ? buscar(CAMPOS + ', hora_inicio, hora_fim') : Promise.resolve({ data: [] }),
    supabase.from('equipe').select('user_id, nome').order('nome'),
  ]);
  // Antes de rodar o tarefas-horario.sql a coluna de horário não existe: carrega sem ela
  const temHorario = !eTarefas;
  if (eTarefas) ({ data: tarefas } = await buscar(CAMPOS));

  const lista = (tarefas || []).map((t) => ({
    id: t.id,
    titulo: t.titulo,
    status: t.status,
    prioridade: t.prioridade,
    responsavel: t.responsavel,
    prazo: t.prazo,
    hora_inicio: t.hora_inicio || null,
    hora_fim: t.hora_fim || null,
    grupo_id: t.grupo_id,
    subs_total: (t.tarefa_subtarefas || []).length,
    subs_feitas: (t.tarefa_subtarefas || []).filter((s) => s.feito).length,
    atualizacoes: t.tarefa_atualizacoes?.[0]?.count || 0,
  }));

  return (
    <Quadro
      key={setor.slug + (secao || '')}
      setor={{ slug: setor.slug, nome: setor.nome, sigla: setor.sigla, cor: setor.cor }}
      secao={secao}
      titulo={titulo}
      grupos={grupos || []}
      tarefas={lista}
      equipe={equipe || []}
      hoje={hojeISO()}
      visaoInicial={visao}
      iaAtiva={!!(process.env.GEMINI_API_KEY || '').trim()}
      temHorario={temHorario}
    />
  );
}
