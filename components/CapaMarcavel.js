'use client';

import { useState, useTransition } from 'react';
import { alternarTreinamento } from '@/app/actions-aluno';
import CapaTreinamento from './CapaTreinamento';

// Capa clicável para o time marcar / desmarcar que a pessoa já fez o treinamento.
export default function CapaMarcavel({ t, clienteId, membroId, feito: inicial, data }) {
  const [feito, setFeito] = useState(inicial);
  const [erro, setErro] = useState('');
  const [, iniciar] = useTransition();

  function alternar() {
    const novo = !feito;
    setFeito(novo);
    setErro('');
    iniciar(async () => {
      try {
        await alternarTreinamento({ cliente_id: clienteId, membro_id: membroId, treinamento_id: t.id, feito: novo });
      } catch (e) {
        setFeito(!novo);
        setErro(e?.message || 'Não foi possível salvar.');
      }
    });
  }

  return (
    <button
      type="button"
      className="capa-botao"
      onClick={alternar}
      aria-pressed={feito}
      title={feito ? 'Clique para desmarcar' : 'Clique para marcar como feito'}
    >
      <CapaTreinamento t={t} feito={feito} data={feito ? data : null} rotuloPendente="Marcar como feito" />
      {erro ? <span className="small" style={{ color: 'var(--coral)' }}>{erro}</span> : null}
    </button>
  );
}
