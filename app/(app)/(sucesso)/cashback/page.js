import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { COR_CATEGORIA, NIVEIS, fmtMoeda, nivelDe } from '@/lib/cashback';
import { COR_PRODUTO, corAvatar, fmtData, iniciais } from '@/lib/util';
import Icone from '@/components/Icone';

export default async function Cashback({ searchParams }) {
  const ordem = searchParams?.ordem === 'saldo' ? 'saldo' : 'total_ganho';
  const supabase = createClient();
  const [{ data: saldos, error }, { data: clientes }, { data: recentes }] = await Promise.all([
    supabase.from('cashback_saldos').select('*'),
    supabase.from('clientes').select('id, nome, empresa, produto').neq('status', 'encerrado'),
    supabase.from('cashback_movimentos').select('id, cliente_id, tipo, valor, categoria, motivo, criado_em').order('criado_em', { ascending: false }).limit(12),
  ]);

  if (error) {
    return (
      <>
        <div className="topo"><h1 className="titulo">Cashback</h1></div>
        <section className="card" style={{ maxWidth: 620 }}>
          <h2 className="h2">Falta ativar o cashback no banco</h2>
          <p className="muted" style={{ margin: 0 }}>Rode uma vez o arquivo supabase/cashback.sql no SQL Editor do Supabase e recarregue a página.</p>
        </section>
      </>
    );
  }

  const porCliente = Object.fromEntries((saldos || []).map((s) => [s.cliente_id, s]));
  const nomes = Object.fromEntries((clientes || []).map((c) => [c.id, c]));
  const ranking = (clientes || [])
    .map((c) => ({ c, s: porCliente[c.id] || { saldo: 0, total_ganho: 0, total_resgatado: 0 } }))
    .sort((a, b) => Number(b.s[ordem]) - Number(a.s[ordem]));

  const somar = (k) => (saldos || []).reduce((t, s) => t + Number(s[k] || 0), 0);
  const emAberto = somar('saldo');
  const distribuido = somar('total_ganho');
  const resgatado = somar('total_resgatado');
  const porNivel = NIVEIS.map((n) => ({ n, qtd: ranking.filter(({ s }) => nivelDe(s.total_ganho).atual.nome === n.nome).length }));

  return (
    <>
      <div className="topo anim">
        <div>
          <span className="eyebrow">Gamificação dos clientes</span>
          <h1 className="titulo">Cashback</h1>
        </div>
      </div>

      <div className="grid-kpi">
        <div className="kpi anim anim-1">
          <span className="icone t-green"><Icone nome="cashback" tamanho={20} /></span>
          <span className="muted">Saldo em aberto</span>
          <span className="valor" style={{ color: 'var(--verde)' }}>{fmtMoeda(emAberto)}</span>
          <span className="small muted">que os clientes ainda podem usar</span>
        </div>
        <div className="kpi anim anim-2">
          <span className="icone t-blue"><Icone nome="trofeu" tamanho={20} /></span>
          <span className="muted">Total distribuído</span>
          <span className="valor">{fmtMoeda(distribuido)}</span>
        </div>
        <div className="kpi anim anim-3">
          <span className="icone t-amber"><Icone nome="check" tamanho={20} /></span>
          <span className="muted">Total resgatado</span>
          <span className="valor">{fmtMoeda(resgatado)}</span>
        </div>
      </div>

      <div className="colunas">
        <section className="card col-principal anim anim-2">
          <div className="entre">
            <h2 className="h2">Ranking</h2>
            <div className="segmentos" role="group" aria-label="Ordenar por">
              <Link href="/cashback" className={ordem === 'total_ganho' ? 'ativo' : ''}>Total ganho</Link>
              <Link href="/cashback?ordem=saldo" className={ordem === 'saldo' ? 'ativo' : ''}>Saldo</Link>
            </div>
          </div>
          {ranking.length === 0 ? (
            <div className="vazio">Nenhum cliente ativo.</div>
          ) : (
            <div className="pilha" style={{ gap: 8 }}>
              {ranking.map(({ c, s }, i) => {
                const nv = nivelDe(s.total_ganho);
                return (
                  <Link key={c.id} href={`/clientes/${c.id}?aba=cashback`} className="cartao" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                    <span
                      className={i < 3 && Number(s[ordem]) > 0 ? 'pill t-' + ['amber', 'blue', 'coral'][i] : 'pill t-gray'}
                      style={{ minWidth: 40, justifyContent: 'center' }}
                    >
                      {i + 1}º
                    </span>
                    <span className="linha" style={{ flex: '1 1 220px', flexWrap: 'nowrap', minWidth: 0 }}>
                      <span className={'av t-' + corAvatar(c.id)}>{iniciais(c.nome)}</span>
                      <span className="pilha-p" style={{ gap: 2, minWidth: 0 }}>
                        <span style={{ fontWeight: 600 }}>{c.nome}</span>
                        <span className="small muted">{c.empresa}</span>
                      </span>
                    </span>
                    <span className={'pill t-' + COR_PRODUTO[c.produto]}>{c.produto}</span>
                    <span className={'pill t-' + nv.atual.cor}>{nv.atual.nome}</span>
                    <span className="pilha-p" style={{ gap: 2, alignItems: 'flex-end', minWidth: 110 }}>
                      <strong style={{ color: 'var(--verde)' }}>{fmtMoeda(s.saldo)}</strong>
                      <span className="small muted">{fmtMoeda(s.total_ganho)} ganhos</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <aside className="col-lateral anim anim-3">
          <section className="card">
            <h2 className="h2">Clientes por nível</h2>
            {porNivel.map(({ n, qtd }) => (
              <div key={n.nome} className="entre">
                <span className="linha" style={{ gap: 8 }}>
                  <span className={'pill t-' + n.cor}>{n.nome}</span>
                  <span className="small muted">a partir de {fmtMoeda(n.min)}</span>
                </span>
                <strong>{qtd}</strong>
              </div>
            ))}
          </section>
          <section className="card">
            <h2 className="h2">Últimos lançamentos</h2>
            {(recentes || []).length === 0 ? <div className="vazio">Nenhum lançamento ainda.</div> : null}
            {(recentes || []).map((m) => (
              <Link key={m.id} href={`/clientes/${m.cliente_id}?aba=cashback`} className="entre" style={{ color: 'var(--texto)', paddingBottom: 10, borderBottom: '1px solid var(--borda)' }}>
                <span className="pilha-p" style={{ gap: 2, minWidth: 0 }}>
                  <span style={{ fontWeight: 600 }}>{nomes[m.cliente_id]?.nome || 'Cliente'}</span>
                  <span className="linha" style={{ gap: 6 }}>
                    <span className={'pill t-' + (COR_CATEGORIA[m.categoria] || 'gray')}>{m.categoria}</span>
                    <span className="small muted">{fmtData(m.criado_em)}</span>
                  </span>
                </span>
                <strong style={{ color: m.tipo === 'credito' ? 'var(--verde)' : 'var(--coral)', whiteSpace: 'nowrap' }}>
                  {m.tipo === 'credito' ? '+ ' : '− '}{fmtMoeda(m.valor)}
                </strong>
              </Link>
            ))}
          </section>
        </aside>
      </div>
    </>
  );
}
