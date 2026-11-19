import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { TIPOS_EVENTO, diaSemana, momentoEvento, nomeMes, resumoItens } from '@/lib/eventos';
import { hojeISO } from '@/lib/tarefas';
import { criarEvento } from '@/app/actions-eventos';

// Uma linha da agenda: data, nome, horário/local, situação e andamento do checklist. Clica e abre o evento.
function LinhaAgenda({ ev, itens, hoje }) {
  const momento = momentoEvento(ev, hoje);
  const r = resumoItens(itens);
  const dia = ev.data_inicio ? ev.data_inicio.slice(8, 10) : '—';
  const diaFim = ev.data_fim && ev.data_fim !== ev.data_inicio ? ev.data_fim.slice(8, 10) : null;
  return (
    <Link href={`/eventos/${ev.id}`} className={'agenda-linha' + (momento.nome === 'Acontecendo' ? ' agora' : '')}>
      <span className="agenda-data">
        <b>{dia}{diaFim ? <span className="agenda-ate">–{diaFim}</span> : null}</b>
        <span>{ev.data_inicio ? diaSemana(ev.data_inicio) + (diaFim ? ' a ' + diaSemana(ev.data_fim) : '') : 'sem data'}</span>
      </span>
      <span className="agenda-info">
        <span className="agenda-nome">{ev.nome}</span>
        <span className="small muted">{[ev.tipo, ev.horario, ev.local].filter(Boolean).join(' · ') || 'Abrir para ver o briefing'}</span>
      </span>
      <span className="agenda-check" title={`${r.feitos} de ${r.total} itens do checklist`}>
        <span className="small" style={{ color: r.total && !r.pendentes ? 'var(--verde)' : 'var(--texto3)' }}>
          {r.total ? `${r.pct}% do checklist` : 'sem checklist'}
          {r.faltou ? <span style={{ color: 'var(--coral)' }}> · {r.faltou} faltou</span> : null}
        </span>
        <span className="barra"><span style={{ width: r.pct + '%', background: 'var(--verde)' }} /></span>
      </span>
      <span className={'pill t-' + momento.cor}>{momento.nome}</span>
    </Link>
  );
}

export default async function Eventos() {
  const perfil = await getPerfil();
  const supabase = createClient();
  const [{ data: eventos, error }, { data: itens }] = await Promise.all([
    supabase.from('eventos').select('*').order('data_inicio', { ascending: true, nullsFirst: false }).order('nome'),
    supabase.from('evento_itens').select('evento_id, setor, estado'),
  ]);
  if (error) {
    return <div className="aviso t-amber">Falta ativar os eventos: rode o arquivo supabase/eventos-rh.sql no SQL Editor do Supabase.</div>;
  }
  const hoje = hojeISO();
  const lista = eventos || [];
  const proximos = lista.filter((e) => !e.data_inicio || (e.data_fim || e.data_inicio) >= hoje);
  const realizados = lista.filter((e) => e.data_inicio && (e.data_fim || e.data_inicio) < hoje).reverse();
  const doEvento = (id) => (itens || []).filter((i) => i.evento_id === id);
  const podeCriar = perfil.admin || podeSetor(perfil, 'eventos');

  // Agenda separada por mês
  const meses = [];
  for (const e of proximos) {
    const chave = e.data_inicio ? e.data_inicio.slice(0, 7) : 'sem-data';
    let m = meses.find((x) => x.chave === chave);
    if (!m) meses.push((m = { chave, nome: e.data_inicio ? nomeMes(e.data_inicio) : 'Sem data', eventos: [] }));
    m.eventos.push(e);
  }
  const em30 = proximos.filter((e) => e.data_inicio && e.data_inicio <= new Date(Date.parse(hoje + 'T12:00:00Z') + 30 * 86400000).toISOString().slice(0, 10)).length;

  return (
    <>
      <div className="topo">
        <div>
          <span className="eyebrow">Agenda, briefing e checklist de cada setor</span>
          <h1 className="titulo">Eventos</h1>
          <span className="small" style={{ color: 'var(--texto3)' }}>
            {proximos.length} {proximos.length === 1 ? 'evento pela frente' : 'eventos pela frente'}
            {em30 ? `, ${em30} nos próximos 30 dias` : ''}. Clique num evento para ver o briefing e o checklist.
          </span>
        </div>
      </div>

      {podeCriar ? (
        <details className="card" style={{ maxWidth: 900 }}>
          <summary className="h2" style={{ cursor: 'pointer' }}>+ Novo evento</summary>
          <form action={criarEvento} className="pilha" style={{ marginTop: 14 }}>
            <div className="form-grid">
              <div className="campo"><label htmlFor="n-nome">Nome do evento *</label><input id="n-nome" name="nome" required placeholder="Ex.: GI Alphaville" /></div>
              <div className="campo">
                <label htmlFor="n-tipo">Tipo</label>
                <select id="n-tipo" name="tipo" defaultValue="">
                  <option value="">—</option>
                  {TIPOS_EVENTO.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="campo"><label htmlFor="n-ini">Início</label><input id="n-ini" name="data_inicio" type="date" style={{ colorScheme: 'dark' }} /></div>
              <div className="campo"><label htmlFor="n-fim">Fim</label><input id="n-fim" name="data_fim" type="date" style={{ colorScheme: 'dark' }} /></div>
              <div className="campo"><label htmlFor="n-hora">Horário</label><input id="n-hora" name="horario" placeholder="Ex.: 9h às 19h" /></div>
              <div className="campo"><label htmlFor="n-local">Local</label><input id="n-local" name="local" placeholder="Ex.: Capital Upgrade Campinas" /></div>
            </div>
            <label className="small" style={{ display: 'inline-flex', gap: 8, alignItems: 'center', color: 'var(--texto3)' }}>
              <input type="checkbox" name="checklist" value="sim" defaultChecked />
              Já criar o checklist padrão de Vendas, Marketing, Eventos e Financeiro
            </label>
            <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>Criar evento</button>
          </form>
        </details>
      ) : null}

      {meses.length ? (
        meses.map((m) => (
          <section key={m.chave} className="pilha-p" style={{ gap: 10 }}>
            <div className="entre">
              <h2 className="h2">{m.nome}</h2>
              <span className="small muted">{m.eventos.length} {m.eventos.length === 1 ? 'evento' : 'eventos'}</span>
            </div>
            <div className="agenda">
              {m.eventos.map((e) => <LinhaAgenda key={e.id} ev={e} itens={doEvento(e.id)} hoje={hoje} />)}
            </div>
          </section>
        ))
      ) : (
        <div className="vazio" style={{ padding: 24, fontSize: 14 }}>Nenhum evento marcado.</div>
      )}

      {realizados.length ? (
        <details className="pilha-p realizados">
          <summary className="h2" style={{ cursor: 'pointer' }}>Realizados ({realizados.length})</summary>
          <div className="agenda" style={{ marginTop: 12 }}>
            {realizados.map((e) => <LinhaAgenda key={e.id} ev={e} itens={doEvento(e.id)} hoje={hoje} />)}
          </div>
        </details>
      ) : null}
    </>
  );
}
