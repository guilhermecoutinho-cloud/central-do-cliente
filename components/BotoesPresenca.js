'use client';

import { useEffect, useState, useTransition } from 'react';
import { marcarPresenca } from '@/app/actions';

// valor: true = presente, false = faltou, null = sem marcação.
export default function BotoesPresenca({ encontroId, membroId, valor: inicial }) {
  const [valor, setValor] = useState(inicial);
  const [, iniciar] = useTransition();

  useEffect(() => setValor(inicial), [inicial]);

  function marcar(presente) {
    const anterior = valor;
    const novo = valor === presente ? null : presente;
    setValor(novo);
    const fd = new FormData();
    fd.set('encontro_id', encontroId);
    fd.set('membro_id', membroId);
    fd.set('presente', novo === null ? 'limpar' : novo ? '1' : '0');
    iniciar(async () => {
      try {
        await marcarPresenca(fd);
      } catch {
        setValor(anterior);
      }
    });
  }

  return (
    <span className="linha" style={{ gap: 6 }}>
      <button type="button" onClick={() => marcar(true)} className={'btn btn-p ' + (valor === true ? '' : 'btn-sec')} aria-pressed={valor === true}>
        Presente
      </button>
      <button
        type="button"
        onClick={() => marcar(false)}
        className="btn btn-p btn-sec"
        aria-pressed={valor === false}
        style={valor === false ? { background: 'var(--amber)', color: 'var(--verde-escuro)', borderColor: 'var(--amber)' } : {}}
      >
        Faltou
      </button>
    </span>
  );
}
