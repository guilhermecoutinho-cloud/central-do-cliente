import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { excluirEncontro, marcarPresenca, marcarRestantesComoFalta } from '@/app/actions';
import { COR_PRODUTO, corAvatar, fmtDataHora, iniciais } from '@/lib/util';

export default async function Chamada({ params }) {
  const supabase = createClient();
  const { data: e } = await supabase.from('encontros').select('*').eq('id', params.id).maybeSingle();
  if (!e) notFound();

  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nome, empresa')
    .eq('produto', e.produto)
    .in('status', ['onboarding', 'ativo'])
    .order('empresa');
  const idsClientes = (clientes || []).map((c) => c.id);
  let membros = [];
  if (idsClientes.length) {
    const { data } = await supabase.from('membros').select('id, nome, cargo, cliente_id').in('cliente_id', idsClientes).order('nome');
    membros = data || [];
  }
  const { data: presencas } = await supabase.from('presencas').select('membro_id, presente').eq('encontro_id', e.id);
  const marca = {};
  (presencas || []).forEach((p) => (marca[p.membro_id] = p.presente));

  const presentes = membros.filter((m) => marca[m.id] === true).length;
  const faltas = membros.filter((m) => marca[m.id] === false).length;
  const semMarca = membros.filter((m) => marca[m.id] === undefined);
  const pct = membros.length ? Math.round((presentes / membros.length) * 100) : 0;

  return (
    <>
      <div className="topo anim">
        <div>
          <Link href="/encontros" className="small">Encontros e presença</Link>
          <h1 className="titulo-m" style={{ marginTop: 6 }}>{e.titulo}</h1>
          <div className="linha" style={{ marginTop: 8, gap: 8 }}>
            <span className={'pill t-' + COR_PRODUTO[e.produto]}>{e.produto}</span>
            <span className="pill t-gray">{fmtDataHora(e.data)}</span>
            {e.link ? <a href={e.link} target="_blank" rel="noreferrer" className="pill t-blue">Abrir link do Zoom</a> : null}
          </div>
        </div>
      </div>

      <div className="colunas">
        <section className="card col-principal anim anim-1">
          <div className="entre">
            <div className="pilha-p">
              <span className="muted">Chamada</span>
              <span style={{ fontSize: 26, fontWeight: 700 }}>
                <span style={{ color: 'var(--verde)' }}>{presentes}</span> de {membros.length} presentes
              </span>
            </div>
            <div className="linha" style={{ gap: 6 }}>
              <span className="pill t-green">{presentes} presentes</span>
              <span className="pill t-amber">{faltas} faltas</span>
              <span className="pill t-gray">{semMarca.length} sem marcar</span>
            </div>
          </div>
          <div className="barra"><span className="s-green" style={{ width: pct + '%' }} /></div>

          {(clientes || []).length === 0 ? (
            <div className="vazio">Nenhum cliente ativo de {e.produto}.</div>
          ) : (
            (clientes || []).map((c) => {
              const doCliente = membros.filter((m) => m.cliente_id === c.id);
              return (
                <div key={c.id} className="pilha" style={{ gap: 8 }}>
                  <Link href={`/clientes/${c.id}?aba=time`} className="small" style={{ fontWeight: 600, color: 'var(--muted)' }}>
                    {c.empresa} · {c.nome}
                  </Link>
                  {doCliente.length === 0 ? <span className="vazio">Time não cadastrado</span> : null}
                  {doCliente.map((m) => {
                    const v = marca[m.id];
                    return (
                      <div key={m.id} className="card-2 entre" style={{ padding: '10px 14px' }}>
                        <span className="linha" style={{ flexWrap: 'nowrap' }}>
                          <span className={'av t-' + corAvatar(m.id)} style={{ width: 32, height: 32 }}>{iniciais(m.nome)}</span>
                          <span className="pilha-p" style={{ gap: 2 }}>
                            <span style={{ fontWeight: 600 }}>{m.nome}</span>
                            <span className="small muted">{m.cargo || ''}</span>
                          </span>
                        </span>
                        <span className="linha" style={{ gap: 6 }}>
                          <form action={marcarPresenca}>
                            <input type="hidden" name="encontro_id" value={e.id} />
                            <input type="hidden" name="membro_id" value={m.id} />
                            <input type="hidden" name="presente" value={v === true ? 'limpar' : '1'} />
                            <button type="submit" className={'btn btn-p ' + (v === true ? '' : 'btn-sec')} aria-pressed={v === true}>Presente</button>
                          </form>
                          <form action={marcarPresenca}>
                            <input type="hidden" name="encontro_id" value={e.id} />
                            <input type="hidden" name="membro_id" value={m.id} />
                            <input type="hidden" name="presente" value={v === false ? 'limpar' : '0'} />
                            <button
                              type="submit"
                              className="btn btn-p btn-sec"
                              aria-pressed={v === false}
                              style={v === false ? { background: 'var(--amber)', color: 'var(--verde-escuro)', borderColor: 'var(--amber)' } : {}}
                            >
                              Faltou
                            </button>
                          </form>
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </section>

        <aside className="col-lateral anim anim-2">
          <form action={marcarRestantesComoFalta} className="card">
            <h2 className="h2">Fechar a chamada</h2>
            <span className="muted">Marca como falta quem ainda está sem marcação ({semMarca.length}).</span>
            <input type="hidden" name="encontro_id" value={e.id} />
            <input type="hidden" name="membros" value={semMarca.map((m) => m.id).join(',')} />
            <button type="submit" className="btn btn-sec" disabled={!semMarca.length} style={{ alignSelf: 'flex-start' }}>Marcar restantes como falta</button>
          </form>
          <section className="card">
            <h2 className="h2">Dica</h2>
            <span className="muted">Quem entrou no Zoom com nome que não está aqui não faz parte do time cadastrado. Confira na aba Time do cliente antes de liberar.</span>
          </section>
          <form action={excluirEncontro} className="card" style={{ borderColor: 'rgba(240,134,110,.3)' }}>
            <input type="hidden" name="encontro_id" value={e.id} />
            <span className="muted">Excluir o encontro apaga também a chamada dele.</span>
            <button type="submit" className="btn-perigo" style={{ alignSelf: 'flex-start' }}>Excluir encontro</button>
          </form>
        </aside>
      </div>
    </>
  );
}
