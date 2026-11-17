'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CHAVE_MUDO, tocarSom } from './LembreteTarefas';

const CHAVE_DIA = 'central:conteudo-hoje';

// "Hoje tem conteúdo": aparece ao abrir a Central para quem é do Marketing.
// O som toca uma vez por dia (o aviso aparece toda vez que abrir).
export default function AvisoConteudoHoje({ hoje, posts, pendentes }) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (!posts.length && !pendentes) return undefined;
    setVisivel(true);
    try {
      const mudo = window.localStorage.getItem(CHAVE_MUDO) === '1';
      if (posts.length && !mudo && window.localStorage.getItem(CHAVE_DIA) !== hoje) {
        window.localStorage.setItem(CHAVE_DIA, hoje);
        setTimeout(() => tocarSom([[784, 0], [1046, 0.14]]), 900);
      }
    } catch {}
    const t = setTimeout(() => setVisivel(false), 30000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visivel) return null;
  const mostrados = posts.slice(0, 3);

  return (
    <div className="lembrete aviso-conteudo" role="status" aria-live="polite">
      <span className="lembrete-icone" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="17" rx="3" />
          <path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
      </span>
      <div className="pilha-p" style={{ gap: 8, minWidth: 0, flex: 1 }}>
        <span style={{ fontWeight: 600 }}>
          {posts.length ? (posts.length === 1 ? 'Hoje tem conteúdo' : `Hoje tem ${posts.length} conteúdos`) : 'Conteúdos sem link'}
        </span>
        {mostrados.length ? (
          <ul className="aviso-nova-lista">
            {mostrados.map((p) => (
              <li key={p.id}>
                <span className="aviso-nova-titulo">{p.descricao}</span>
                <span className="small muted">{[p.campanha, p.formato].filter(Boolean).join(' · ')}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {pendentes ? (
          <span className="small" style={{ color: 'var(--coral)' }}>
            {pendentes} {pendentes === 1 ? 'conteúdo passado ainda está' : 'conteúdos passados ainda estão'} sem link.
          </span>
        ) : null}
        <Link href="/marketing/calendario" className="small" style={{ fontWeight: 600 }} onClick={() => setVisivel(false)}>Abrir calendário</Link>
      </div>
      <button type="button" className="lembrete-fechar" onClick={() => setVisivel(false)} aria-label="Fechar aviso">×</button>
    </div>
  );
}
