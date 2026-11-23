'use client';

import { useEffect, useRef, useState } from 'react';
import { ajustarFim, fmtHorario } from '@/lib/tarefas';

// Horário da tarefa: mostra "14h–15h" e abre um painel com início e fim.
// Com horário, a tarefa entra na Google Agenda nesse intervalo; sem horário, é de dia inteiro.
export default function Horario({ inicio, fim, semPrazo, onSalvar, grande }) {
  const [aberto, setAberto] = useState(false);
  const [ini, setIni] = useState('');
  const [ate, setAte] = useState('');
  const caixa = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    setIni(inicio ? String(inicio).slice(0, 5) : '09:00');
    setAte(fim ? String(fim).slice(0, 5) : inicio ? '' : '10:00');
    const fora = (e) => caixa.current && !caixa.current.contains(e.target) && setAberto(false);
    const esc = (e) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto, inicio, fim]);

  function salvar(e) {
    e.preventDefault();
    const r = ajustarFim(ini || null, ate || null);
    onSalvar(r);
    setAberto(false);
  }

  const texto = inicio ? fmtHorario(inicio, fim) : grande ? 'Dia inteiro' : '+ hora';
  return (
    <span ref={caixa} className={'horario' + (grande ? ' grande' : '') + (inicio ? ' definido' : '')}>
      <button
        type="button"
        className="horario-botao"
        onClick={() => setAberto((a) => !a)}
        disabled={semPrazo}
        title={semPrazo ? 'Coloque um prazo antes de marcar o horário' : inicio ? 'Mudar o horário' : 'Marcar horário (entra na sua agenda nesse horário)'}
        aria-label={inicio ? `Horário ${texto}. Mudar` : 'Marcar horário'}
      >
        {grande ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        ) : null}
        {texto}
      </button>
      {aberto ? (
        <form className="horario-painel" onSubmit={salvar}>
          <div className="linha" style={{ gap: 8 }}>
            <label className="campo" style={{ flex: 1 }}>
              <span className="small muted">Início</span>
              <input type="time" value={ini} onChange={(e) => setIni(e.target.value)} required style={{ colorScheme: 'dark' }} autoFocus />
            </label>
            <label className="campo" style={{ flex: 1 }}>
              <span className="small muted">Fim</span>
              <input type="time" value={ate} min={ini || undefined} onChange={(e) => setAte(e.target.value)} style={{ colorScheme: 'dark' }} />
            </label>
          </div>
          <div className="entre" style={{ gap: 8 }}>
            {inicio ? (
              <button type="button" className="btn-link" style={{ color: 'var(--texto3)' }} onClick={() => { onSalvar({ inicio: null, fim: null }); setAberto(false); }}>
                Dia inteiro
              </button>
            ) : <span />}
            <button type="submit" className="btn" style={{ padding: '8px 14px' }}>Salvar</button>
          </div>
        </form>
      ) : null}
    </span>
  );
}
