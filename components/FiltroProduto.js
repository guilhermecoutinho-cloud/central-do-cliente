import Link from 'next/link';
import { PRODUTOS } from '@/lib/util';

// Botões para filtrar por produto. Mantém os outros filtros da página no endereço.
export default function FiltroProduto({ caminho, atual, outros = {} }) {
  const url = (produto) => {
    const p = new URLSearchParams();
    Object.entries(outros).forEach(([k, v]) => v && p.set(k, v));
    if (produto) p.set('produto', produto);
    const s = p.toString();
    return s ? `${caminho}?${s}` : caminho;
  };
  return (
    <div className="segmentos" role="group" aria-label="Filtrar por produto">
      <Link href={url(null)} className={!atual ? 'ativo' : ''}>Todos os produtos</Link>
      {PRODUTOS.map((p) => (
        <Link key={p} href={url(p)} className={atual === p ? 'ativo' : ''}>{p}</Link>
      ))}
    </div>
  );
}
