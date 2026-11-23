'use client';

import { useState } from 'react';
import { sincronizarAgora } from '@/app/actions-google';

export default function SincronizarGoogle() {
  const [estado, setEstado] = useState(null);
  async function rodar() {
    setEstado({ rodando: true });
    const r = await sincronizarAgora().catch(() => ({ erro: 'A conexão caiu. Tente de novo.' }));
    setEstado(r?.erro ? { erro: r.erro } : { texto: `${r.ok} de ${r.total} ${r.total === 1 ? 'tarefa' : 'tarefas'} na agenda.` });
  }
  return (
    <span className="linha" style={{ gap: 10 }}>
      <button type="button" className="btn btn-sec" onClick={rodar} disabled={estado?.rodando}>
        {estado?.rodando ? 'Sincronizando…' : 'Sincronizar agora'}
      </button>
      {estado?.texto ? <span className="small" style={{ color: 'var(--verde)' }}>{estado.texto}</span> : null}
      {estado?.erro ? <span className="small" style={{ color: 'var(--coral)' }}>{estado.erro}</span> : null}
    </span>
  );
}
