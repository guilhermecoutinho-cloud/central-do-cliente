'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export const CHAVE_MUDO = 'central:lembrete-mudo';

// Toca um "plim" curto (sem arquivo de áudio: gerado na hora pelo navegador)
export function tocarSom(notas = [[880, 0], [1320, 0.16]]) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    const ctx = new Ctx();
    let tocou = false;
    const tocar = () => {
      if (tocou) return;
      tocou = true;
      const agora = ctx.currentTime;
      notas.forEach(([freq, atraso]) => {
        const osc = ctx.createOscillator();
        const vol = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        vol.gain.setValueAtTime(0.0001, agora + atraso);
        vol.gain.exponentialRampToValueAtTime(0.18, agora + atraso + 0.02);
        vol.gain.exponentialRampToValueAtTime(0.0001, agora + atraso + 0.45);
        osc.connect(vol).connect(ctx.destination);
        osc.start(agora + atraso);
        osc.stop(agora + atraso + 0.5);
      });
      setTimeout(() => ctx.close(), 1200);
    };
    if (ctx.state === 'suspended') {
      // O navegador só libera som depois de um clique ou tecla: toca no primeiro toque na página
      const liberar = () => {
        ctx.resume().then(tocar).catch(() => {});
        window.removeEventListener('pointerdown', liberar);
        window.removeEventListener('keydown', liberar);
      };
      ctx.resume().then(() => (ctx.state === 'running' ? tocar() : null)).catch(() => {});
      window.addEventListener('pointerdown', liberar, { once: true });
      window.addEventListener('keydown', liberar, { once: true });
    } else {
      tocar();
    }
    return true;
  } catch {
    return false;
  }
}

// Ao abrir a Central: som + aviso no canto da tela com as tarefas atrasadas e as que vencem hoje.
export default function LembreteTarefas({ atrasadas, hoje }) {
  const [visivel, setVisivel] = useState(false);
  const [mudo, setMudo] = useState(false);
  const jaTocou = useRef(false);

  useEffect(() => {
    if (!atrasadas && !hoje) return undefined;
    let silencio = false;
    try {
      silencio = window.localStorage.getItem(CHAVE_MUDO) === '1';
    } catch {}
    setMudo(silencio);
    setVisivel(true);
    if (!silencio && !jaTocou.current) {
      jaTocou.current = true;
      tocarSom();
    }
    const t = setTimeout(() => setVisivel(false), 20000);
    return () => clearTimeout(t);
    // Só ao abrir a Central (o layout não remonta ao trocar de página)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function alternarSom() {
    const novo = !mudo;
    setMudo(novo);
    try {
      window.localStorage.setItem(CHAVE_MUDO, novo ? '1' : '0');
    } catch {}
    if (!novo) tocarSom();
  }

  if (!visivel) return null;

  const partes = [];
  if (atrasadas) partes.push(`${atrasadas} ${atrasadas === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}`);
  if (hoje) partes.push(`${hoje} ${hoje === 1 ? 'vence hoje' : 'vencem hoje'}`);

  return (
    <div className={'lembrete' + (atrasadas ? ' atrasado' : '')} role="status" aria-live="polite">
      <span className="lembrete-icone" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </span>
      <div className="pilha-p" style={{ gap: 4, minWidth: 0 }}>
        <span style={{ fontWeight: 600 }}>Você tem {partes.join(' e ')}.</span>
        <span className="linha" style={{ gap: 14 }}>
          <Link href="/minhas-tarefas" className="small" style={{ fontWeight: 600 }} onClick={() => setVisivel(false)}>Ver minhas tarefas</Link>
          <button type="button" className="btn-link small muted" style={{ color: 'var(--muted)' }} onClick={alternarSom}>
            {mudo ? 'Ligar o som' : 'Silenciar o som'}
          </button>
        </span>
      </div>
      <button type="button" className="lembrete-fechar" onClick={() => setVisivel(false)} aria-label="Fechar aviso">×</button>
    </div>
  );
}
