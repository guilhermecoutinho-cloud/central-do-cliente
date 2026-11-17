import { createClient } from '@/lib/supabase/server';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { TIPOS_EVENTO } from '@/lib/eventos';
import { hojeISO } from '@/lib/tarefas';
import { criarEvento } from '@/app/actions-eventos';
import EventoCard from '@/components/EventoCard';

export default async function Eventos() {
  const perfil = await getPerfil();
  const supabase = createClient();
  const [{ data: eventos, error }, { data: itens }] = await Promise.all([
    supabase.from('eventos').select('*').order('data_inicio', { ascending: true, nullsFirst: false }),
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

  return (
    <>
      <div className="topo">
        <div>
          <span className="eyebrow">Checklist de cada setor por evento</span>
          <h1 className="titulo">Eventos</h1>
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
              <div className="campo inteiro"><label htmlFor="n-local">Local</label><input id="n-local" name="local" placeholder="Ex.: Capital Upgrade Campinas" /></div>
            </div>
            <label className="small" style={{ display: 'inline-flex', gap: 8, alignItems: 'center', color: 'var(--texto3)' }}>
              <input type="checkbox" name="checklist" value="sim" defaultChecked />
              Já criar o checklist padrão de Vendas, Marketing, Eventos e Financeiro
            </label>
            <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>Criar evento</button>
          </form>
        </details>
      ) : null}

      <section className="pilha">
        <h2 className="h2">Próximos eventos</h2>
        {proximos.length ? (
          <div className="grid-eventos">{proximos.map((e) => <EventoCard key={e.id} ev={e} itens={doEvento(e.id)} />)}</div>
        ) : (
          <div className="vazio" style={{ padding: 24, fontSize: 14 }}>Nenhum evento marcado.</div>
        )}
      </section>

      {realizados.length ? (
        <section className="pilha">
          <h2 className="h2">Realizados</h2>
          <div className="grid-eventos">{realizados.map((e) => <EventoCard key={e.id} ev={e} itens={doEvento(e.id)} />)}</div>
        </section>
      ) : null}
    </>
  );
}
