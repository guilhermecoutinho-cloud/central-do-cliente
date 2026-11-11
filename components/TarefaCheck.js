'use client';

import { useEffect, useState, useTransition } from 'react';
import { alternarTarefa } from '@/app/actions';

// Marca na hora e salva por trás. Se der erro, desfaz.
export default function TarefaCheck({ clienteId, chave, texto, feito: inicial }) {
  const [feito, setFeito] = useState(inicial);
  const [, iniciar] = useTransition();

  useEffect(() => setFeito(inicial), [inicial]);

  function alternar() {
    const novo = !feito;
    setFeito(novo);
    const fd = new FormData();
    fd.set('cliente_id', clienteId);
    fd.set('chave', chave);
    fd.set('feito', novo ? '1' : '0');
    iniciar(async () => {
      try {
        await alternarTarefa(fd);
      } catch {
        setFeito(!novo);
      }
    });
  }

  return (
    <button type="button" onClick={alternar} className={'tarefa' + (feito ? ' ok' : '')} aria-pressed={feito}>
      <span className={'check' + (feito ? ' ok' : '')} aria-hidden="true">{feito ? '✓' : ''}</span>
      <span className="txt">{texto}</span>
    </button>
  );
}
