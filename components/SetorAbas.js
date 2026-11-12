import Link from 'next/link';

// Troca entre o painel (visão geral) e o quadro de tarefas de um setor.
export default function SetorAbas({ slug, ativo }) {
  return (
    <div className="segmentos" role="group" aria-label="Visão do setor">
      <Link href={`/setor/${slug}/painel`} className={ativo === 'painel' ? 'ativo' : ''}>Painel</Link>
      <Link href={`/setor/${slug}`} className={ativo === 'tarefas' ? 'ativo' : ''}>Tarefas</Link>
    </div>
  );
}
