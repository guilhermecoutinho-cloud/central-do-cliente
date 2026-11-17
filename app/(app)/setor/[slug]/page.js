import { notFound } from 'next/navigation';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { setorPorSlug } from '@/lib/setores';
import QuadroServidor from '@/components/tarefas/QuadroServidor';
import SemAcesso from '@/components/SemAcesso';

export default async function QuadroSetor({ params, searchParams }) {
  const setor = setorPorSlug(params.slug);
  if (!setor) notFound();

  const perfil = await getPerfil();
  if (!podeSetor(perfil, setor.slug)) return <SemAcesso setor={setor.nome} />;
  if (perfil.semMigracao) {
    return <div className="card">Rode o arquivo supabase/central-empresa.sql no Supabase para ativar as tarefas.</div>;
  }
  const visao = ['tabela', 'kanban', 'calendario'].includes(searchParams?.visao) ? searchParams.visao : 'tabela';
  // No Financeiro, Pagamentos e Faturamento têm telas próprias; aqui ficam as tarefas gerais
  return <QuadroServidor setor={setor} visao={visao} separarSecoes={setor.slug === 'financeiro'} />;
}
