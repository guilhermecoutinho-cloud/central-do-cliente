import Link from 'next/link';
import { ETAPAS, chave, contarPorEtapa, totalTarefas } from '@/lib/onboarding';
import { origem } from '@/lib/origem';
import { alternarTarefa, mudarEtapa } from '@/app/actions';
import CopiarTexto from '@/components/CopiarTexto';

export default function AbaOnboarding({ c, feitas, searchParams }) {
  const atualCliente = Math.min(c.etapa_onboarding, ETAPAS.length - 1);
  const pedida = parseInt(searchParams.etapa, 10);
  const e = Number.isFinite(pedida) && pedida >= 0 && pedida < ETAPAS.length ? pedida : atualCliente;
  const et = ETAPAS[e];
  const contagem = contarPorEtapa(feitas);
  const total = totalTarefas();
  const ok = contagem.reduce((s, x) => s + x.ok, 0);
  const pct = Math.round((ok / total) * 100);
  const linkFormulario = `${origem()}/formulario/${c.token}`;
  const preencher = (t) => t.replaceAll('{nome}', c.nome.split(' ')[0]).replaceAll('{link_formulario}', linkFormulario);

  return (
    <>
      <div className="entre">
        <span className="muted">Clique numa tarefa para marcar. Quem assumir o cliente continua de onde parou.</span>
        <div className="linha card" style={{ padding: '12px 16px', flexDirection: 'row', gap: 14 }}>
          <div className="anel" style={{ background: `conic-gradient(var(--verde) ${pct}%, var(--borda) 0)` }}><span>{pct}%</span></div>
          <div className="pilha-p" style={{ gap: 2 }}>
            <span style={{ fontWeight: 600 }}>{ok} de {total} tarefas</span>
            <span className="small muted">do onboarding inteiro</span>
          </div>
        </div>
      </div>

      <nav className="passos" aria-label="Etapas do onboarding">
        {ETAPAS.map((x, i) => {
          const completo = contagem[i].ok === contagem[i].total;
          const sel = i === e;
          return (
            <Link
              key={x.nome}
              href={`/clientes/${c.id}?aba=onboarding&etapa=${i}`}
              className={'passo' + (sel ? ' b-' + x.cor : '')}
              aria-current={sel ? 'step' : undefined}
              style={sel ? { background: 'rgba(255,255,255,.03)' } : {}}
            >
              <span className={'num ' + (completo ? 's-green' : 't-' + x.cor)} style={completo ? { color: 'var(--verde-escuro)' } : {}}>
                {completo ? '✓' : i + 1}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{x.nome}</span>
              <span className="small muted">
                {contagem[i].ok} de {contagem[i].total}
                {i === atualCliente && c.status === 'onboarding' ? ' · etapa atual' : ''}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="colunas">
        <div className="col-principal" style={{ gap: 16 }}>
          <div className={'card t-' + et.cor} style={{ gap: 6, border: '1px solid currentColor' }}>
            <span className="small" style={{ fontWeight: 600 }}>{et.resp}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--texto)' }}>{et.nome}</span>
            <span style={{ color: 'var(--texto3)' }}>{et.desc}</span>
          </div>

          {et.secoes.map(([titulo, itens], s) => {
            const feitosSecao = itens.filter((_, i) => feitas.has(chave(e, s, i))).length;
            return (
              <section key={titulo} className="card" style={{ gap: 10 }}>
                <div className="entre">
                  <h2 className="h2" style={{ fontSize: 16 }}>{titulo}</h2>
                  <span className="small muted">{feitosSecao} de {itens.length}</span>
                </div>
                {itens.map((item, i) => {
                  const k = chave(e, s, i);
                  const feito = feitas.has(k);
                  return (
                    <form key={k} action={alternarTarefa}>
                      <input type="hidden" name="cliente_id" value={c.id} />
                      <input type="hidden" name="chave" value={k} />
                      <input type="hidden" name="feito" value={feito ? '0' : '1'} />
                      <button type="submit" className={'tarefa' + (feito ? ' ok' : '')} aria-pressed={feito}>
                        <span className={'check' + (feito ? ' ok' : '')} aria-hidden="true">{feito ? '✓' : ''}</span>
                        <span className="txt">{item}</span>
                      </button>
                    </form>
                  );
                })}
              </section>
            );
          })}

          <div className="card entre" style={{ flexDirection: 'row' }}>
            {e < ETAPAS.length - 1 ? (
              <>
                <span style={{ color: 'var(--texto3)' }}>Terminou esta etapa? A próxima é {ETAPAS[e + 1].nome}.</span>
                <form action={mudarEtapa}>
                  <input type="hidden" name="cliente_id" value={c.id} />
                  <input type="hidden" name="etapa" value={e + 1} />
                  <button type="submit" className="btn">Passar para a próxima etapa</button>
                </form>
              </>
            ) : (
              <>
                <span style={{ color: 'var(--texto3)' }}>Última etapa: o cliente fica Ativo e segue no acompanhamento.</span>
                {c.status !== 'ativo' ? (
                  <form action={mudarEtapa}>
                    <input type="hidden" name="cliente_id" value={c.id} />
                    <input type="hidden" name="etapa" value={e} />
                    <button type="submit" className="btn">Concluir onboarding</button>
                  </form>
                ) : null}
              </>
            )}
          </div>
          {e !== atualCliente ? (
            <form action={mudarEtapa}>
              <input type="hidden" name="cliente_id" value={c.id} />
              <input type="hidden" name="etapa" value={e} />
              <button type="submit" className="btn-link">Marcar {et.nome} como a etapa atual do cliente</button>
            </form>
          ) : null}
        </div>

        <aside className="col-lateral">
          {et.extras.map(([titulo, itens]) => (
            <section key={titulo} className="card" style={{ gap: 10 }}>
              <h2 className="h2" style={{ fontSize: 16 }}>{titulo}</h2>
              {itens.map((t, i) => (
                <div key={t} className="linha" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', color: 'var(--texto3)' }}>
                  <span className={'num t-' + et.cor} style={{ flex: '0 0 22px', height: 22, borderRadius: 7, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
                  <span>{t}</span>
                </div>
              ))}
            </section>
          ))}
          {et.msgs.map(([titulo, txt]) => {
            const pronto = preencher(txt);
            return (
              <section key={titulo} className="card" style={{ gap: 12 }}>
                <div className="entre">
                  <h2 className="h2" style={{ fontSize: 16 }}>{titulo}</h2>
                  <span className="small muted">mensagem pronta</span>
                </div>
                <p className="msg">{pronto}</p>
                <CopiarTexto texto={pronto} />
              </section>
            );
          })}
          {et.extras.length === 0 && et.msgs.length === 0 ? (
            <section className="card">
              <h2 className="h2" style={{ fontSize: 16 }}>Pronto</h2>
              <span className="muted">Depois desta etapa, o acompanhamento segue na Visão geral e em Encontros.</span>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
