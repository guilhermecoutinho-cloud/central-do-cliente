'use client';

import { useState, useTransition } from 'react';
import { adicionarItem, marcarItem, removerItem } from '@/app/actions-eventos';
import { resumoItens } from '@/lib/eventos';
import SetorIcone from './SetorIcone';

// Checklist de um setor dentro do evento: marcar feito, marcar "faltou", acrescentar e tirar itens.
export default function ChecklistSetor({ eventoId, setor, nomeSetor, itens: iniciais, podeEditar, realizado }) {
  const [itens, setItens] = useState(iniciais);
  const [novo, setNovo] = useState('');
  const [erro, setErro] = useState('');
  const [, iniciar] = useTransition();
  const r = resumoItens(itens);

  function rodar(fn, desfazer) {
    setErro('');
    iniciar(async () => {
      try {
        await fn();
      } catch (e) {
        if (desfazer) desfazer();
        setErro(e?.message || 'Não foi possível salvar.');
      }
    });
  }

  function marcar(item, estado) {
    const novoEstado = item.estado === estado ? 'pendente' : estado;
    const antes = item.estado;
    setItens((l) => l.map((x) => (x.id === item.id ? { ...x, estado: novoEstado } : x)));
    rodar(
      () => marcarItem({ id: item.id, evento_id: eventoId, estado: novoEstado }),
      () => setItens((l) => l.map((x) => (x.id === item.id ? { ...x, estado: antes } : x))),
    );
  }

  function remover(item) {
    if (!window.confirm(`Tirar "${item.titulo}" do checklist?`)) return;
    setItens((l) => l.filter((x) => x.id !== item.id));
    rodar(() => removerItem({ id: item.id, evento_id: eventoId }), () => setItens((l) => [...l, item]));
  }

  function adicionar(e) {
    e.preventDefault();
    const titulo = novo.trim();
    if (!titulo) return;
    setNovo('');
    const temp = { id: 'novo-' + Date.now(), titulo, estado: 'pendente' };
    setItens((l) => [...l, temp]);
    rodar(
      async () => {
        const criado = await adicionarItem({ evento_id: eventoId, setor, titulo });
        setItens((l) => l.map((x) => (x.id === temp.id ? criado : x)));
      },
      () => setItens((l) => l.filter((x) => x.id !== temp.id)),
    );
  }

  return (
    <section className="card checklist-setor">
      <div className="entre" style={{ flexWrap: 'nowrap' }}>
        <span className="linha" style={{ gap: 10, flexWrap: 'nowrap' }}>
          <SetorIcone slug={setor} tamanho={32} />
          <span className="h2">{nomeSetor}</span>
        </span>
        <span className="small" style={{ color: 'var(--texto3)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{r.feitos} de {r.total}</span>
      </div>
      <div className="pilha-p" style={{ gap: 6 }}>
        <div className="barra-seg" aria-hidden="true">
          {r.feitos ? <span style={{ width: (r.feitos / Math.max(1, r.total)) * 100 + '%', background: 'var(--verde)' }} /> : null}
          {r.faltou ? <span style={{ width: (r.faltou / Math.max(1, r.total)) * 100 + '%', background: 'var(--coral)' }} /> : null}
        </div>
        <span className="small muted">
          {r.pct}% feito
          {r.pendentes ? ` · ${realizado ? 'ficaram sem marcar' : 'faltam'} ${r.pendentes}` : ''}
          {r.faltou ? ` · ${r.faltou} ${r.faltou === 1 ? 'faltou' : 'faltaram'}` : ''}
        </span>
      </div>

      <div className="check-lista">
        {itens.map((i) => (
          <div key={i.id} className={'check-item ' + i.estado}>
            <button
              type="button"
              className="check-box"
              onClick={() => marcar(i, 'feito')}
              disabled={!podeEditar || String(i.id).startsWith('novo-')}
              aria-pressed={i.estado === 'feito'}
              aria-label={(i.estado === 'feito' ? 'Desmarcar ' : 'Marcar como feito: ') + i.titulo}
            >
              {i.estado === 'feito' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
              ) : i.estado === 'faltou' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              ) : null}
            </button>
            <span className="check-titulo">{i.titulo}</span>
            {podeEditar && !String(i.id).startsWith('novo-') ? (
              <span className="check-acoes">
                <button type="button" className={'check-faltou' + (i.estado === 'faltou' ? ' on' : '')} onClick={() => marcar(i, 'faltou')} title="Marcar que faltou / deixou de ter">
                  Faltou
                </button>
                <button type="button" className="check-remover" onClick={() => remover(i)} aria-label={'Tirar ' + i.titulo}>×</button>
              </span>
            ) : null}
          </div>
        ))}
        {itens.length === 0 ? <div className="vazio">Nenhum item neste setor.</div> : null}
      </div>

      {podeEditar ? (
        <form onSubmit={adicionar} className="q-add" style={{ border: 0, padding: 0 }}>
          <input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="+ Acrescentar item" aria-label={'Novo item de ' + nomeSetor} />
        </form>
      ) : (
        <span className="small muted">Só quem é de {nomeSetor} marca este checklist.</span>
      )}
      {erro ? <span className="small" style={{ color: 'var(--coral)' }}>{erro}</span> : null}
    </section>
  );
}
