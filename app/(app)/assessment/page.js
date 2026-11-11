import Link from 'next/link';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/server';
import { origem } from '@/lib/origem';
import { adicionarPergunta, alternarPergunta, removerPergunta } from '@/app/actions';
import { COR_PRODUTO, corAvatar, fmtDataHora, iniciais } from '@/lib/util';
import CopiarTexto from '@/components/CopiarTexto';

export default async function Assessment({ searchParams }) {
  const ver = searchParams?.ver === 'pendentes' ? 'pendentes' : 'respostas';
  const sel = searchParams?.r || null;
  const supabase = createClient();

  const [{ data: perguntas }, { data: respostas, error }, { data: clientes }] = await Promise.all([
    supabase.from('assessment_perguntas').select('*').order('ordem'),
    supabase.from('assessment_respostas').select('*').order('criado_em', { ascending: false }),
    supabase.from('clientes').select('id, nome, empresa, produto').in('status', ['onboarding', 'ativo']),
  ]);
  if (error) throw new Error(error.message);

  const idsClientes = (clientes || []).map((c) => c.id);
  let membros = [];
  if (idsClientes.length) {
    const { data } = await supabase.from('membros').select('id, nome, cliente_id').in('cliente_id', idsClientes);
    membros = data || [];
  }
  const clientePorId = Object.fromEntries((clientes || []).map((c) => [c.id, c]));
  const responderam = new Set((respostas || []).map((r) => r.membro_id).filter(Boolean));
  const pendentes = membros.filter((m) => !responderam.has(m.id));
  const totalPessoas = membros.length;
  const qtdResponderam = membros.filter((m) => responderam.has(m.id)).length;
  const pct = totalPessoas ? Math.round((qtdResponderam / totalPessoas) * 100) : 0;

  const link = `${origem()}/responder`;
  const svg = await QRCode.toString(link, { type: 'svg', margin: 1, width: 198, color: { dark: '#07090A', light: '#FFFFFF' } });
  const png = await QRCode.toDataURL(link, { width: 1024, margin: 2 });

  const atual = (respostas || []).find((r) => r.id === sel) || (respostas || [])[0] || null;

  return (
    <>
      <div className="topo anim">
        <div>
          <span className="eyebrow">Só clientes da central · não inclui inscritos de eventos</span>
          <h1 className="titulo">Assessment</h1>
        </div>
      </div>

      <div className="colunas">
        <aside className="col-lateral anim anim-1" style={{ flexBasis: 320 }}>
          <section className="card">
            <div className="pilha-p">
              <h2 className="h2">QR Code do assessment</h2>
              <span className="muted">Mostre no encontro ou mande no grupo. Quem responde cai direto no próprio dossiê.</span>
            </div>
            <div style={{ background: '#fff', borderRadius: 16, padding: 16, alignSelf: 'center', width: 230, height: 230 }} dangerouslySetInnerHTML={{ __html: svg }} aria-label="QR Code do assessment" role="img" />
            <span className="small muted" style={{ textAlign: 'center', wordBreak: 'break-all' }}>{link}</span>
            <div className="linha">
              <a href={png} download="qr-assessment-capital-upgrade.png" className="btn btn-p" style={{ flex: 1 }}>Baixar QR</a>
              <span className="btn btn-sec btn-p" style={{ flex: 1 }}><CopiarTexto texto={link} rotulo="Copiar link" /></span>
            </div>
            <div className="pilha" style={{ borderTop: '1px solid var(--borda)', paddingTop: 14, gap: 10 }}>
              <span style={{ fontWeight: 600 }}>Como funciona</span>
              <span className="linha" style={{ flexWrap: 'nowrap', color: 'var(--texto3)' }}><span className="tag t-blue" style={{ flex: '0 0 22px' }}>1</span>Cliente lê o QR Code no celular</span>
              <span className="linha" style={{ flexWrap: 'nowrap', color: 'var(--texto3)' }}><span className="tag t-violet" style={{ flex: '0 0 22px' }}>2</span>Informa o e-mail ou telefone do cadastro</span>
              <span className="linha" style={{ flexWrap: 'nowrap', color: 'var(--texto3)' }}><span className="tag t-green" style={{ flex: '0 0 22px' }}>3</span>Responde e a resposta entra com o nome dele</span>
            </div>
          </section>

          <section className="card">
            <h2 className="h2">Perguntas</h2>
            {(perguntas || []).length === 0 ? <div className="vazio">Nenhuma pergunta ainda. Adicione abaixo.</div> : null}
            {(perguntas || []).map((p, i) => (
              <div key={p.id} className="card-2 pilha" style={{ gap: 8, opacity: p.ativa ? 1 : 0.6 }}>
                <span><span className="muted">{i + 1}.</span> {p.texto}</span>
                <span className="linha" style={{ gap: 14 }}>
                  <form action={alternarPergunta}>
                    <input type="hidden" name="pergunta_id" value={p.id} />
                    <input type="hidden" name="ativa" value={p.ativa ? '0' : '1'} />
                    <button type="submit" className="btn-link">{p.ativa ? 'Desativar' : 'Ativar'}</button>
                  </form>
                  <form action={removerPergunta}>
                    <input type="hidden" name="pergunta_id" value={p.id} />
                    <button type="submit" className="btn-perigo">Excluir</button>
                  </form>
                </span>
              </div>
            ))}
            <form action={adicionarPergunta} className="pilha">
              <div className="campo"><label htmlFor="q-texto">Nova pergunta</label><textarea id="q-texto" name="texto" required style={{ minHeight: 70 }} /></div>
              <button type="submit" className="btn btn-sec btn-p" style={{ alignSelf: 'flex-start' }}>Adicionar pergunta</button>
            </form>
          </section>
        </aside>

        <div className="col-principal anim anim-2">
          <section className="card">
            <div className="entre" style={{ alignItems: 'flex-end' }}>
              <div className="pilha-p">
                <span className="muted">Quem já respondeu</span>
                <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  <span style={{ color: 'var(--verde)' }}>{qtdResponderam}</span> de {totalPessoas} pessoas
                </span>
              </div>
              <div className="segmentos" role="group" aria-label="Ver">
                <Link href="/assessment" className={ver === 'respostas' ? 'ativo' : ''}>Respostas ({(respostas || []).length})</Link>
                <Link href="/assessment?ver=pendentes" className={ver === 'pendentes' ? 'ativo' : ''}>Pendentes ({pendentes.length})</Link>
              </div>
            </div>
            <div className="barra"><span className="s-green" style={{ width: pct + '%' }} /></div>

            {ver === 'respostas' ? (
              (respostas || []).length === 0 ? (
                <div className="vazio">Ninguém respondeu ainda.</div>
              ) : (
                <div className="pilha" style={{ gap: 8 }}>
                  {respostas.map((r) => {
                    const c = r.cliente_id ? clientePorId[r.cliente_id] : null;
                    const ativo = atual && atual.id === r.id;
                    return (
                      <Link key={r.id} href={`/assessment?r=${r.id}`} className="cartao" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, borderColor: ativo ? 'var(--verde)' : undefined }}>
                        <span className="linha" style={{ flex: '1 1 220px', flexWrap: 'nowrap' }}>
                          <span className={'av t-' + corAvatar(r.nome)}>{iniciais(r.nome)}</span>
                          <span className="pilha-p" style={{ gap: 2 }}>
                            <span style={{ fontWeight: 600 }}>{r.nome}</span>
                            <span className="small muted">{c ? c.empresa : 'Não identificado no cadastro'}</span>
                          </span>
                        </span>
                        {c ? <span className={'pill t-' + COR_PRODUTO[c.produto]}>{c.produto}</span> : <span className="pill t-amber">Conferir</span>}
                        <span className="small muted">{fmtDataHora(r.criado_em)}</span>
                      </Link>
                    );
                  })}
                </div>
              )
            ) : pendentes.length === 0 ? (
              <div className="vazio">Todo mundo respondeu.</div>
            ) : (
              <div className="pilha" style={{ gap: 8 }}>
                {pendentes.map((m) => {
                  const c = clientePorId[m.cliente_id];
                  return (
                    <Link key={m.id} href={`/clientes/${m.cliente_id}?aba=time`} className="cartao" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                      <span className="linha" style={{ flex: '1 1 220px', flexWrap: 'nowrap' }}>
                        <span className={'av t-' + corAvatar(m.id)}>{iniciais(m.nome)}</span>
                        <span className="pilha-p" style={{ gap: 2 }}>
                          <span style={{ fontWeight: 600 }}>{m.nome}</span>
                          <span className="small muted">{c?.empresa}</span>
                        </span>
                      </span>
                      {c ? <span className={'pill t-' + COR_PRODUTO[c.produto]}>{c.produto}</span> : null}
                      <span className="pill t-amber">Pendente</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {ver === 'respostas' && atual ? (
            <section className="card">
              <div className="entre">
                <div className="pilha-p">
                  <span className="muted">Respostas de</span>
                  <h2 className="h2">{atual.nome}</h2>
                  <span className="small muted">{atual.contato}</span>
                </div>
                {atual.cliente_id ? <Link href={`/clientes/${atual.cliente_id}?aba=dossie&sec=formularios`} className="small" style={{ fontWeight: 600 }}>Abrir dossiê</Link> : null}
              </div>
              {(Array.isArray(atual.respostas) ? atual.respostas : []).map((q, i) => (
                <div key={i} className="entre" style={{ padding: '12px 0', borderBottom: '1px solid var(--borda)', alignItems: 'flex-start' }}>
                  <span className="muted" style={{ flex: '1 1 200px' }}>{q.pergunta}</span>
                  <span style={{ flex: '2 1 280px', whiteSpace: 'pre-line' }}>{q.resposta || '—'}</span>
                </div>
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
