'use client';

import { Children, useEffect, useRef, useState } from 'react';

// Mostra os itens de 10 em 10: quando a pessoa rola até o fim da lista, aparecem mais.
// A lista rola por dentro (para baixo), então a página não fica enorme.
export default function ListaIncremental({ children, passo = 10, className = '' }) {
  const itens = Children.toArray(children);
  const [qtd, setQtd] = useState(passo);
  const caixa = useRef(null);
  const fim = useRef(null);

  useEffect(() => {
    if (qtd >= itens.length || !fim.current) return undefined;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) setQtd((n) => Math.min(n + passo, itens.length));
      },
      { root: caixa.current, rootMargin: '120px' },
    );
    obs.observe(fim.current);
    return () => obs.disconnect();
  }, [qtd, itens.length, passo]);

  return (
    <div ref={caixa} className={'lista-rolavel ' + className}>
      {itens.slice(0, qtd)}
      {qtd < itens.length ? (
        <div ref={fim} className="lista-mais">
          <button type="button" className="btn-link" onClick={() => setQtd((n) => Math.min(n + passo, itens.length))}>
            Mostrar mais ({itens.length - qtd})
          </button>
        </div>
      ) : null}
    </div>
  );
}
