import Link from 'next/link';
import { ETAPAS, REGRAS, contarPorEtapa } from '@/lib/onboarding';
import { PERFIS, fmtData, fmtDataHora } from '@/lib/util';
import { definirPerfil, mudarStatus, registrarRenovacao } from '@/app/actions';

export default function AbaGeral({ c, r, membros, feitas }) {
  const contagem = contarPorEtapa(feitas);
  const atual = c.status === 'onboarding' ? c.etapa_onboarding : ETAPAS.length;
  const pctRoadmap = Math.round((Math.min(atual, ETAPAS.length) / ETAPAS.length) * 100);

  return (
    <>
      <section className="card">
        <div className="entre">
          <h2 className="h2">Roadmap · em que etapa ele está</h2>
          <span className="pill t-gray">
            {c.status === 'onboarding' ? `Etapa ${atual + 1} de ${ETAPAS.length}` : 'Onboarding concluído'}
          </span>
        </div>
        <div className="barra" style={{ height: 4 }}><span className="s-green" style={{ width: pctRoadmap + '%' }} /></div>
        <div className="passos">
          {ETAPAS.map((et, i) => {
            const feito = i < atual;
            const corrente = i === atual;
            return (
              <Link
                key={et.nome}
                href={`/clientes/${c.id}?aba=onboarding&etapa=${i}`}
                className={'passo' + (corrente ? ' b-' + et.cor : '')}
                style={corrente ? { background: 'rgba(255,255,255,.03)' } : feito ? {} : { borderStyle: 'dashed' }}
              >
                <span className={'num ' + (feito ? 's-green' : 't-' + et.cor)} style={feito ? { color: 'var(--verde-escuro)' } : {}}>
                  {feito ? '✓' : i + 1}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{et.nome}</span>
                <span className="small muted">{contagem[i].ok} de {contagem[i].total} tarefas</span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="colunas">
        <div className="col-principal">
          <section className="card">
            <h2 className="h2">O que ele comprou</h2>
            <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
              <div className="card-2 t-green" style={{ border: 0 }}><div className="small" style={{ fontWeight: 600 }}>Produto</div><div style={{ color: 'var(--texto)', fontWeight: 600, marginTop: 6 }}>{c.produto}</div></div>
              <div className="card-2 t-blue" style={{ border: 0 }}><div className="small" style={{ fontWeight: 600 }}>Início</div><div style={{ color: 'var(--texto)', fontWeight: 600, marginTop: 6 }}>{fmtData(c.data_inicio)}</div></div>
              <div className="card-2 t-violet" style={{ border: 0 }}><div className="small" style={{ fontWeight: 600 }}>Encontros contratados</div><div style={{ color: 'var(--texto)', fontWeight: 600, marginTop: 6 }}>{c.encontros_contratados}</div></div>
              <div className="card-2 t-amber" style={{ border: 0 }}><div className="small" style={{ fontWeight: 600 }}>Condições</div><div style={{ color: 'var(--texto)', fontWeight: 600, marginTop: 6 }}>{c.condicoes || '—'}</div></div>
            </div>
          </section>

          <section className="card">
            <h2 className="h2">Regras do produto</h2>
            <div className="grid-auto">
              <div className="card-2 pilha" style={{ background: 'rgba(98,204,116,.07)', borderColor: 'rgba(98,204,116,.2)' }}>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>Pode</span>
                {REGRAS.pode.map((t) => <span key={t} style={{ color: 'var(--texto2)' }}>{t}</span>)}
              </div>
              <div className="card-2 pilha" style={{ background: 'rgba(245,184,74,.07)', borderColor: 'rgba(245,184,74,.2)' }}>
                <span style={{ color: 'var(--amber)', fontWeight: 600 }}>Não pode</span>
                {REGRAS.naoPode.map((t) => <span key={t} style={{ color: 'var(--texto2)' }}>{t}</span>)}
              </div>
            </div>
          </section>
        </div>

        <aside className="col-lateral">
          <section className="card">
            <h2 className="h2">Encontros</h2>
            <div className="linha" style={{ alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--verde)', letterSpacing: '-0.03em' }}>{r.saldo}</span>
              <span className="muted">encontros restantes</span>
            </div>
            <span style={{ color: 'var(--texto3)' }}>
              Participou de {r.participou} · faltou {r.faltou} · {r.usados} já aconteceram
            </span>
            <span className="small muted">Próximo: {r.proximo ? `${fmtDataHora(r.proximo.data)} · ${r.proximo.titulo}` : 'sem data'}</span>
            <form action={registrarRenovacao} className="pilha" style={{ borderTop: '1px solid var(--borda)', paddingTop: 14 }}>
              <input type="hidden" name="id" value={c.id} />
              <div className="campo">
                <label htmlFor="quantidade">Renovou? Quantos encontros a mais</label>
                <input id="quantidade" name="quantidade" type="number" min="1" placeholder="Ex.: 3" required />
              </div>
              <button type="submit" className="btn btn-sec btn-p" style={{ alignSelf: 'flex-start' }}>Registrar renovação</button>
            </form>
          </section>

          <section className="card">
            <h2 className="h2">Perfil e status</h2>
            <form action={definirPerfil} className="linha" style={{ flexWrap: 'nowrap' }}>
              <input type="hidden" name="id" value={c.id} />
              <select name="perfil" defaultValue={c.perfil || ''} className="input" aria-label="Perfil do cliente">
                <option value="">Perfil não definido</option>
                {PERFIS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button type="submit" className="btn btn-sec btn-p">Salvar</button>
            </form>
            <form action={mudarStatus} className="linha" style={{ flexWrap: 'nowrap' }}>
              <input type="hidden" name="id" value={c.id} />
              <select name="status" defaultValue={c.status} className="input" aria-label="Status do cliente">
                <option value="onboarding">Em onboarding</option>
                <option value="ativo">Ativo</option>
                <option value="encerrado">Encerrado</option>
              </select>
              <button type="submit" className="btn btn-sec btn-p">Salvar</button>
            </form>
          </section>

          <section className="card">
            <h2 className="h2">Atalhos</h2>
            <Link href={`/clientes/${c.id}?aba=time`}>Time cadastrado ({membros.length} {membros.length === 1 ? 'pessoa' : 'pessoas'})</Link>
            <Link href={`/clientes/${c.id}?aba=dossie&sec=arquivos`}>Contrato e documentos</Link>
            <Link href={`/clientes/${c.id}?aba=dossie&sec=formularios`}>Formulários e respostas</Link>
          </section>
        </aside>
      </div>
    </>
  );
}
