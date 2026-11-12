import { createClient } from '@/lib/supabase/server';
import { removerMovimentoCashback } from '@/app/actions';
import { COR_CATEGORIA, NIVEIS, conquistasDe, fmtMoeda, nivelDe } from '@/lib/cashback';
import { fmtData } from '@/lib/util';
import FormCashback from '@/components/FormCashback';

export default async function AbaCashback({ c, r }) {
  const supabase = createClient();
  const [{ data: movimentos, error }, { data: saldo }] = await Promise.all([
    supabase.from('cashback_movimentos').select('*').eq('cliente_id', c.id).order('criado_em', { ascending: false }),
    supabase.from('cashback_saldos').select('*').eq('cliente_id', c.id).maybeSingle(),
  ]);

  if (error) {
    return (
      <section className="card">
        <h2 className="h2">Falta ativar o cashback no banco</h2>
        <p className="muted" style={{ margin: 0 }}>Rode uma vez o arquivo supabase/cashback.sql no SQL Editor do Supabase e recarregue a página.</p>
      </section>
    );
  }

  const s = saldo || { saldo: 0, total_ganho: 0, total_resgatado: 0 };
  const nivel = nivelDe(s.total_ganho);
  const conquistas = conquistasDe({ cliente: c, resumoEnc: r, movimentos: movimentos || [], saldo: s });
  const feitas = conquistas.filter((x) => x.ok).length;

  return (
    <div className="colunas">
      <div className="col-principal">
        <div className="grid-kpi">
          <div className="kpi">
            <span className="muted">Saldo disponível</span>
            <span className="valor" style={{ color: 'var(--verde)' }}>{fmtMoeda(s.saldo)}</span>
            <span className="small muted">pode usar quando quiser</span>
          </div>
          <div className="kpi">
            <span className="muted">Total ganho</span>
            <span className="valor">{fmtMoeda(s.total_ganho)}</span>
            <span className="small muted">desde a entrada</span>
          </div>
          <div className="kpi">
            <span className="muted">Já resgatou</span>
            <span className="valor">{fmtMoeda(s.total_resgatado)}</span>
          </div>
        </div>

        <section className="card">
          <div className="entre">
            <div className="linha" style={{ gap: 12 }}>
              <span className={'av av-g t-' + nivel.atual.cor} style={{ fontSize: 15 }} aria-hidden="true">
                {nivel.atual.nome.slice(0, 2).toUpperCase()}
              </span>
              <div className="pilha-p" style={{ gap: 2 }}>
                <span className="small muted">Nível</span>
                <span style={{ fontSize: 22, fontWeight: 700 }}>{nivel.atual.nome}</span>
              </div>
            </div>
            <span className="muted">
              {nivel.proximo ? `Faltam ${fmtMoeda(nivel.falta)} para ${nivel.proximo.nome}` : 'Nível máximo'}
            </span>
          </div>
          <div className="barra" style={{ height: 10 }}>
            <span className={'s-' + (nivel.proximo ? nivel.proximo.cor : nivel.atual.cor)} style={{ width: nivel.pct + '%' }} />
          </div>
          <div className="passos" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
            {NIVEIS.map((n) => {
              const chegou = Number(s.total_ganho) >= n.min;
              return (
                <div key={n.nome} className={'passo' + (n.nome === nivel.atual.nome ? ' b-' + n.cor : '')} style={chegou ? {} : { opacity: 0.55, borderStyle: 'dashed' }}>
                  <span className={'pill t-' + n.cor} style={{ alignSelf: 'flex-start' }}>{n.nome}</span>
                  <span className="small muted">a partir de {fmtMoeda(n.min)}</span>
                </div>
              );
            })}
          </div>
        </section>

        <FormCashback clienteId={c.id} saldo={Number(s.saldo)} />

        <section className="card">
          <h2 className="h2">Histórico</h2>
          {(movimentos || []).length === 0 ? (
            <div className="vazio">Nenhum lançamento ainda.</div>
          ) : (
            <div className="pilha" style={{ gap: 8 }}>
              {movimentos.map((m) => (
                <div key={m.id} className="card-2 entre" style={{ padding: '12px 14px' }}>
                  <span className="linha" style={{ flex: '1 1 260px', flexWrap: 'nowrap', minWidth: 0 }}>
                    <span className={'pill t-' + (COR_CATEGORIA[m.categoria] || 'gray')}>{m.categoria}</span>
                    <span className="pilha-p" style={{ gap: 2, minWidth: 0 }}>
                      <span style={{ color: 'var(--texto2)' }}>{m.motivo || '—'}</span>
                      <span className="small muted">{fmtData(m.criado_em)}{m.autor ? ' · ' + m.autor : ''}</span>
                    </span>
                  </span>
                  <span className="linha" style={{ gap: 14 }}>
                    <strong style={{ color: m.tipo === 'credito' ? 'var(--verde)' : 'var(--coral)', whiteSpace: 'nowrap' }}>
                      {m.tipo === 'credito' ? '+ ' : '− '}{fmtMoeda(m.valor)}
                    </strong>
                    <form action={removerMovimentoCashback}>
                      <input type="hidden" name="cliente_id" value={c.id} />
                      <input type="hidden" name="movimento_id" value={m.id} />
                      <button type="submit" className="btn-perigo" aria-label="Excluir lançamento">Excluir</button>
                    </form>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="col-lateral">
        <section className="card">
          <div className="entre">
            <h2 className="h2">Conquistas</h2>
            <span className="pill t-green">{feitas} de {conquistas.length}</span>
          </div>
          {conquistas.map((q) => (
            <div key={q.nome} className="linha" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', opacity: q.ok ? 1 : 0.5 }}>
              <span className={'check' + (q.ok ? ' ok' : '')} aria-hidden="true" style={{ animation: 'none' }}>{q.ok ? '✓' : ''}</span>
              <span className="pilha-p" style={{ gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{q.nome}</span>
                <span className="small muted">{q.desc}</span>
              </span>
            </div>
          ))}
        </section>
        <section className="card">
          <h2 className="h2">Como funciona</h2>
          <span style={{ color: 'var(--texto3)' }}>
            O cliente ganha cashback por indicação, renovação, presença, depoimento e desafios. O nível sobe pelo total ganho e não cai quando ele resgata.
          </span>
          <span className="small muted">Valores e níveis são exemplos e podem ser ajustados em lib/cashback.js.</span>
        </section>
      </aside>
    </div>
  );
}
