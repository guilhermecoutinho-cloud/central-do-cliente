'use client';

import { useEffect, useRef, useState } from 'react';

// Botão que abre uma lista de opções (como a célula de status do Monday).
// opcoes: [{ valor, rotulo, estilo?, conteudo? }]
export default function Escolha({ rotulo, botao, botaoClasse, botaoEstilo, opcoes, valor, onEscolher, largura = 190, alinhar = 'left' }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => {
      if (caixa.current && !caixa.current.contains(e.target)) setAberto(false);
    };
    const tecla = (e) => {
      if (e.key === 'Escape') setAberto(false);
    };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  return (
    <div ref={caixa} className="escolha">
      <button
        type="button"
        className={botaoClasse}
        style={botaoEstilo}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-label={rotulo}
        onClick={() => setAberto((v) => !v)}
      >
        {botao}
      </button>
      {aberto ? (
        <div role="listbox" aria-label={rotulo} className="escolha-lista" style={{ width: largura, [alinhar]: 0 }}>
          {opcoes.map((o) => (
            <button
              key={String(o.valor)}
              type="button"
              role="option"
              aria-selected={o.valor === valor}
              className={'escolha-op' + (o.valor === valor ? ' sel' : '')}
              style={o.estilo}
              onClick={() => {
                setAberto(false);
                if (o.valor !== valor) onEscolher(o.valor, o.rotulo);
              }}
            >
              {o.conteudo || o.rotulo}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
