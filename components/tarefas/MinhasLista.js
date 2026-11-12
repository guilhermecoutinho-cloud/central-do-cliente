'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { atualizarTarefa } from '@/app/actions-tarefas';
import { atrasada, corStatus, fmtPrazo, separarPorPrazo } from '@/lib/tarefas';
import { SETORES } from '@/lib/setores';
import Icone from '@/components/Icone';

const COR_SETOR = Object.fromEntries(SETORES.map((s) => [s.slug, s]));

export default function MinhasLista({ tarefas: iniciais, hoje }) {
  const [tarefas, setTarefas] = useState(iniciais);
  const [erro, setErro] = useState('');
  const [, iniciar] = useTransition();

  useEffect(() => setTarefas(iniciais), [iniciais]);

  function concluir(t) {
    const novo = t.status === 'Feito' ? 'Não iniciado' : 'Feito';
    const antes = t.status;
    setTarefas((l) => l.map((x) => (x.id === t.id ? { ...x, status: novo } : x)));
    iniciar(async () => {
      try {
        await atualizarTarefa({ id: t.id, setor: t.setor, campo: 'status', valor: novo, rotulo: novo });
      } catch (e) {
        setTarefas((l) => l.map((x) => (x.id === t.id ? { ...x, status: antes } : x)));
        setErro(e?.message || 'Não foi possível salvar.');
        setTimeout(() => setErro(''), 5000);
      }
    });
  }

  const secoes = separarPorPrazo(tarefas, hoje);
  const concluidas = tarefas.filter((t) => t.status === 'Feito');
  if (concluidas.length) secoes.push({ nome: 'Concluídas', cor: '#94A39A', itens: concluidas });

  const abertas = tarefas.filter((t) => t.status !== 'Feito');
  const kpis = [
    ['Abertas', abertas.length, 'blue', 'check'],
    ['Atrasadas', abertas.filter((t) => atrasada(t, hoje)).length, 'coral', 'relogio'],
    ['Vencem hoje', abertas.filter((t) => t.prazo === hoje).length, 'amber', 'calendario'],
    ['Concluídas', concluidas.length, 'green', 'trofeu'],
  ];

  return (
    <>
      <div className="grid-kpi">
        {kpis.map(([nome, n, cor, icone]) => (
          <div key={nome} className={'kpi tom-' + cor}>
            <span className="icone"><Icone nome={icone} tamanho={20} /></span>
            <span className="muted">{nome}</span>
            <span className={'valor' + (n && cor !== 'blue' ? ' cor' : '')}>{n}</span>
          </div>
        ))}
      </div>

      {tarefas.length === 0 ? <div className="vazio">Nenhuma tarefa com você. Quando alguém te colocar como responsável, ela aparece aqui.</div> : null}

      {secoes.map((sec) =>
        sec.itens.length === 0 ? null : (
          <section key={sec.nome} className="pilha" style={{ gap: 8 }}>
            <div className="linha" style={{ gap: 10 }}>
              <h2 className="h2" style={{ color: sec.cor }}>{sec.nome}</h2>
              <span className="small muted">{sec.itens.length}</span>
            </div>
            {sec.itens.map((t) => {
              const st = corStatus(t.status);
              const s = COR_SETOR[t.setor];
              const feito = t.status === 'Feito';
              return (
                <div key={t.id} className={'card-2 linha' + (s ? ' faixa tom-' + s.cor : '')} style={{ gap: 12, padding: '10px 14px 10px 17px' }}>
                  <button
                    type="button"
                    className={'check' + (feito ? ' ok' : '')}
                    style={{ cursor: 'pointer', background: feito ? undefined : 'transparent', width: 26, height: 26, flex: '0 0 26px' }}
                    aria-pressed={feito}
                    aria-label={(feito ? 'Reabrir ' : 'Concluir ') + t.titulo}
                    onClick={() => concluir(t)}
                  >
                    {feito ? '✓' : ''}
                  </button>
                  <Link href={`/tarefas/${t.id}`} style={{ flex: '1 1 260px', color: feito ? 'var(--muted2)' : 'var(--texto)', textDecoration: feito ? 'line-through' : 'none', fontWeight: 500 }}>
                    {t.titulo}
                  </Link>
                  {s ? <span className={'pill t-' + s.cor}>{s.nome}</span> : null}
                  <span className="pill" style={{ background: st.bg, color: st.fg, minWidth: 104, justifyContent: 'center' }}>{t.status}</span>
                  <span className="small" style={{ minWidth: 64, textAlign: 'right', color: atrasada(t, hoje) ? 'var(--coral)' : 'var(--texto3)', fontWeight: atrasada(t, hoje) ? 700 : 400 }}>
                    {t.prazo ? fmtPrazo(t.prazo, hoje) : 'Sem prazo'}
                  </span>
                </div>
              );
            })}
          </section>
        )
      )}

      {erro ? <div className="aviso t-coral toast" role="alert">{erro}</div> : null}
    </>
  );
}
