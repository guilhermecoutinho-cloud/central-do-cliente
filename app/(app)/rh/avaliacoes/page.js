import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { COMPETENCIAS, mediaNotas } from '@/lib/rh';
import { criarAvaliacao, removerAvaliacao } from '@/app/actions-rh';
import SetorIcone from '@/components/SetorIcone';
import BotaoConfirmar from '@/components/BotaoConfirmar';

const fmtDia = (d) => (d ? d.split('-').reverse().join('/') : '');

export default async function Avaliacoes({ searchParams }) {
  const supabase = createClient();
  const [{ data: pessoas, error }, { data: avaliacoes }] = await Promise.all([
    supabase.from('rh_pessoas').select('id, nome, cargo, area').eq('ativo', true).order('nome'),
    supabase.from('rh_avaliacoes').select('*').order('data', { ascending: false }),
  ]);
  if (error) return <div className="aviso t-amber">Falta ativar o RH: rode o arquivo supabase/eventos-rh.sql no SQL Editor do Supabase.</div>;
  const lista = pessoas || [];
  const todas = avaliacoes || [];
  const pessoaSel = searchParams?.pessoa || '';

  const porPessoa = lista.map((p) => {
    const dela = todas.filter((a) => a.pessoa_id === p.id);
    return { p, ultima: dela[0] || null, total: dela.length, media: dela[0] ? mediaNotas(dela[0].notas) : null };
  });
  const filtradas = pessoaSel ? todas.filter((a) => a.pessoa_id === pessoaSel) : todas;
  const nome = (id) => lista.find((p) => p.id === id)?.nome || 'Pessoa removida';

  return (
    <>
      <div className="topo">
        <div className="pilha-p">
          <span className="selo"><SetorIcone slug="rh" tamanho={24} />RH</span>
          <h1 className="titulo">Avaliações de desempenho</h1>
          <span className="small" style={{ color: 'var(--texto3)' }}>Notas de 1 a 5 por competência, pontos fortes, o que desenvolver e plano de ação.</span>
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="vazio" style={{ padding: 24, fontSize: 14 }}>
          Primeiro cadastre as pessoas no <Link href="/rh/organograma">Organograma</Link>.
        </div>
      ) : (
        <>
          <section className="card">
            <h2 className="h2">Time</h2>
            <div className="lista-alerta">
              {porPessoa.map(({ p, ultima, total, media }) => (
                <div key={p.id} style={{ alignItems: 'center' }}>
                  <span className="pilha-p" style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Link href={`/rh/avaliacoes?pessoa=${p.id}`} style={{ fontWeight: 600, color: 'var(--texto)' }}>{p.nome}</Link>
                    <span className="small muted">{[p.cargo, p.area].filter(Boolean).join(' · ') || '—'}</span>
                  </span>
                  <span className="small muted" style={{ whiteSpace: 'nowrap' }}>{ultima ? `última: ${ultima.periodo}` : 'nunca avaliado'}</span>
                  <span className={'pill ' + (media === null ? 't-gray' : media >= 4 ? 't-green' : media >= 3 ? 't-gray' : 't-coral')} style={{ minWidth: 52, justifyContent: 'center' }}>
                    {media === null ? '—' : String(media).replace('.', ',')}
                  </span>
                  <span className="small muted" style={{ width: 70, textAlign: 'right' }}>{total} {total === 1 ? 'avaliação' : 'avaliações'}</span>
                </div>
              ))}
            </div>
          </section>

          <details className="card" style={{ maxWidth: 960 }}>
            <summary className="h2" style={{ cursor: 'pointer' }}>+ Nova avaliação</summary>
            <form action={criarAvaliacao} className="pilha" style={{ marginTop: 14 }}>
              <div className="form-grid">
                <div className="campo">
                  <label htmlFor="av-p">Pessoa *</label>
                  <select id="av-p" name="pessoa_id" required defaultValue={pessoaSel}>
                    <option value="" disabled>Escolha</option>
                    {lista.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label htmlFor="av-per">Período *</label><input id="av-per" name="periodo" required placeholder="Ex.: 2º semestre 2026" /></div>
                <div className="campo"><label htmlFor="av-aval">Avaliador</label><input id="av-aval" name="avaliador" placeholder="Quem avaliou" /></div>
                <div className="campo"><label htmlFor="av-data">Data</label><input id="av-data" name="data" type="date" style={{ colorScheme: 'dark' }} /></div>
              </div>
              <div className="pilha-p" style={{ gap: 10 }}>
                <span className="small muted">Nota de 1 (abaixo do esperado) a 5 (acima do esperado)</span>
                {COMPETENCIAS.map((c, i) => (
                  <div key={c} className="competencia">
                    <span className="small" style={{ color: 'var(--texto2)' }}>{c}</span>
                    <div className="notas-5" role="radiogroup" aria-label={c}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <label key={n} className="nps-nota">
                          <input type="radio" name={'c' + i} value={n} />
                          <span>{n}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="form-grid">
                <div className="campo"><label htmlFor="av-f">Pontos fortes</label><textarea id="av-f" name="pontos_fortes" rows={3} /></div>
                <div className="campo"><label htmlFor="av-d">O que desenvolver</label><textarea id="av-d" name="desenvolver" rows={3} /></div>
                <div className="campo inteiro"><label htmlFor="av-pl">Plano de ação</label><textarea id="av-pl" name="plano_acao" rows={3} placeholder="O que a pessoa e o gestor vão fazer, e até quando" /></div>
              </div>
              <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>Salvar avaliação</button>
            </form>
          </details>

          <section className="pilha" style={{ gap: 12 }}>
            <div className="entre">
              <h2 className="h2">{pessoaSel ? `Avaliações de ${nome(pessoaSel)}` : 'Últimas avaliações'}</h2>
              {pessoaSel ? <Link href="/rh/avaliacoes" className="small" style={{ fontWeight: 600 }}>Ver de todos</Link> : null}
            </div>
            {filtradas.length === 0 ? <div className="vazio">Nenhuma avaliação ainda.</div> : null}
            {filtradas.map((a) => {
              const media = mediaNotas(a.notas);
              return (
                <details key={a.id} className="card avaliacao">
                  <summary className="entre" style={{ cursor: 'pointer' }}>
                    <span className="pilha-p" style={{ gap: 2 }}>
                      <span style={{ fontWeight: 600 }}>{nome(a.pessoa_id)} · {a.periodo}</span>
                      <span className="small muted">{fmtDia(a.data)}{a.avaliador ? ' · por ' + a.avaliador : ''}</span>
                    </span>
                    <span className={'pill ' + (media === null ? 't-gray' : media >= 4 ? 't-green' : media >= 3 ? 't-gray' : 't-coral')}>Média {media === null ? '—' : String(media).replace('.', ',')}</span>
                  </summary>
                  <div className="graf-barras" style={{ marginTop: 6 }}>
                    {COMPETENCIAS.map((c) => (
                      <div key={c} className="graf-barra">
                        <span className="rot">{c}</span>
                        <span className="trilho"><span style={{ width: ((a.notas?.[c] || 0) / 5) * 100 + '%' }} /></span>
                        <span className="num">{a.notas?.[c] ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                  <div className="form-grid">
                    {a.pontos_fortes ? <div className="pilha-p"><span className="small muted">Pontos fortes</span><p className="msg">{a.pontos_fortes}</p></div> : null}
                    {a.desenvolver ? <div className="pilha-p"><span className="small muted">O que desenvolver</span><p className="msg">{a.desenvolver}</p></div> : null}
                    {a.plano_acao ? <div className="pilha-p inteiro"><span className="small muted">Plano de ação</span><p className="msg">{a.plano_acao}</p></div> : null}
                  </div>
                  <form action={removerAvaliacao}>
                    <input type="hidden" name="id" value={a.id} />
                    <BotaoConfirmar pergunta="Excluir esta avaliação?">Excluir avaliação</BotaoConfirmar>
                  </form>
                </details>
              );
            })}
          </section>
        </>
      )}
    </>
  );
}
