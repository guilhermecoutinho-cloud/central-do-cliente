import { notFound } from 'next/navigation';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { setorPorSlug } from '@/lib/setores';
import QuadroServidor from '@/components/tarefas/QuadroServidor';
import SemAcesso from '@/components/SemAcesso';

const SECOES = {
  pagamentos: { secao: 'financeiro', titulo: 'Financeiro: pagamentos, notas fiscais e links' },
  faturamento: { secao: 'faturamento', titulo: 'Faturamento: comprovantes, contratos e Omie' },
};

export default async function SecaoFinanceiro({ params, searchParams }) {
  const s = SECOES[params.secao];
  if (!s) notFound();
  const perfil = await getPerfil();
  if (!podeSetor(perfil, 'financeiro')) return <SemAcesso setor="Financeiro" />;
  const visao = ['tabela', 'kanban', 'calendario'].includes(searchParams?.visao) ? searchParams.visao : 'tabela';
  return <QuadroServidor setor={setorPorSlug('financeiro')} secao={s.secao} titulo={s.titulo} visao={visao} />;
}
