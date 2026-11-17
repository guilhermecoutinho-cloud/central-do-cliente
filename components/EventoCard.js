import Link from 'next/link';
import { setorPorSlug } from '@/lib/setores';
import { SETORES_EVENTO, fmtPeriodo, momentoEvento, resumoItens } from '@/lib/eventos';
import SetorIcone from './SetorIcone';

// Cartão de um evento: andamento geral, cada setor e o que falta. Clica e abre o evento.
export default function EventoCard({ ev, itens }) {
  const momento = momentoEvento(ev);
  const geral = resumoItens(itens);
  return (
    <Link href={`/eventos/${ev.id}`} className="card evento-card">
      <div className="entre" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <span className="pilha-p" style={{ gap: 4, minWidth: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{ev.nome}</span>
          <span className="small muted">{[ev.tipo, fmtPeriodo(ev), ev.local].filter(Boolean).join(' · ')}</span>
        </span>
        <span className={'pill t-' + momento.cor}>{momento.nome}</span>
      </div>
      <div className="pilha-p" style={{ gap: 6 }}>
        <div className="entre">
          <span className="small" style={{ color: 'var(--texto3)' }}>{geral.pct}% do checklist</span>
          <span className="small" style={{ color: geral.pendentes ? 'var(--texto3)' : 'var(--verde)' }}>
            {geral.pendentes ? `faltam ${geral.pendentes}` : 'tudo feito'}
            {geral.faltou ? <span style={{ color: 'var(--coral)' }}> · {geral.faltou} faltou</span> : null}
          </span>
        </div>
        <div className="barra"><span style={{ width: geral.pct + '%', background: 'var(--verde)' }} /></div>
      </div>
      <div className="evento-setores">
        {SETORES_EVENTO.map((s) => {
          const r = resumoItens(itens.filter((i) => i.setor === s));
          return (
            <span key={s} className="evento-setor" title={`${setorPorSlug(s).nome}: ${r.feitos} de ${r.total}`}>
              <SetorIcone slug={s} tamanho={22} />
              <span className="small">{setorPorSlug(s).nome}</span>
              <span className="small" style={{ marginLeft: 'auto', color: r.total && r.pendentes === 0 && !r.faltou ? 'var(--verde)' : 'var(--texto3)', fontVariantNumeric: 'tabular-nums' }}>
                {r.feitos}/{r.total}
              </span>
            </span>
          );
        })}
      </div>
      {ev.avaliacao_nota !== null && ev.avaliacao_nota !== undefined ? <span className="small muted">Avaliação: {ev.avaliacao_nota}/10</span> : null}
    </Link>
  );
}
