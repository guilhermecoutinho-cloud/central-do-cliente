import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { setorPorSlug } from '@/lib/setores';
import { hojeISO } from '@/lib/tarefas';
import Quadro from '@/components/tarefas/Quadro';
import SemAcesso from '@/components/SemAcesso';

export default async function QuadroSetor({ params, searchParams }) {
  const setor = setorPorSlug(params.slug);
  if (!setor) notFound();

  const perfil = await getPerfil();
  if (!podeSetor(perfil, setor.slug)) return <SemAcesso setor={setor.nome} />;
  if (perfil.semMigracao) {
    return <div className="card">Rode o arquivo supabase/central-empresa.sql no Supabase para ativar as tarefas.</div>;
  }

  const supabase = createClient();
  const [{ data: grupos, error }, { data: tarefas }, { data: equipe }] = await Promise.all([
    supabase.from('tarefa_grupos').select('id, nome, cor, ordem').eq('setor', setor.slug).order('ordem').order('criado_em'),
    supabase
      .from('tarefas')
      .select('id, titulo, status, prioridade, responsavel, prazo, grupo_id, criado_em, tarefa_subtarefas(feito), tarefa_atualizacoes(count)')
      .eq('setor', setor.slug)
      .order('criado_em'),
    supabase.from('equipe').select('user_id, nome').order('nome'),
  ]);
  if (error) throw new Error(error.message);

  const lista = (tarefas || []).map((t) => ({
    id: t.id,
    titulo: t.titulo,
    status: t.status,
    prioridade: t.prioridade,
    responsavel: t.responsavel,
    prazo: t.prazo,
    grupo_id: t.grupo_id,
    subs_total: (t.tarefa_subtarefas || []).length,
    subs_feitas: (t.tarefa_subtarefas || []).filter((s) => s.feito).length,
    atualizacoes: t.tarefa_atualizacoes?.[0]?.count || 0,
  }));

  const visao = ['tabela', 'kanban', 'calendario'].includes(searchParams?.visao) ? searchParams.visao : 'tabela';

  return (
    <Quadro
      key={setor.slug}
      setor={{ slug: setor.slug, nome: setor.nome }}
      grupos={grupos || []}
      tarefas={lista}
      equipe={equipe || []}
      hoje={hojeISO()}
      visaoInicial={visao}
    />
  );
}
