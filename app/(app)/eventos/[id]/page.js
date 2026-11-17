import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { setorPorSlug } from '@/lib/setores';
import { SETORES_EVENTO, TIPOS_EVENTO, fmtPeriodo, momentoEvento, resumoItens } from '@/lib/eventos';
import { avaliarEvento, editarEvento, excluirEvento } from '@/app/actions-eventos';
import ChecklistSetor from '@/components/ChecklistSetor';
import SetorIcone from '@/components/SetorIcone';
import BotaoConfirmar from '@/components/BotaoConfirmar';

export default async function EventoPagina({ params }) {
  const perfil = await getPerfil();
  const supabase = createClient();
  const [{ data: ev, error }, { data: itens }] = await Promise.all([
    supabase.from('eventos').select('*').eq('id', params.id).maybeSingle(),
    supabase.from('evento_itens').select('*').eq('evento_id', params.id).order('ordem').order('atualizado_em'),
  ]);
  if (error) {
    return <div className="aviso t-amber">Falta ativar os eventos: rode o arquivo supabase/eventos-rh.sql no SQL Editor do Supabase.</div>;
  }
  if (!ev) notFound();

  const lista = itens || [];
  const podeGerir = perfil.admin || podeSetor(perfil, 'eventos');
  const momento = momentoEvento(ev);
  const realizado = momento.nome === 'Realizado';
  const setoresVisiveis = SETORES_EVENTO.filter((s) => podeSetor(perfil, s));
  const geral = resumoItens(lista.filter((i) => setoresVisiveis.includes(i.setor)));
  const pendentes = lista.filter((i) => i.estado === 'pendente' && setoresVisiveis.includes(i.setor));
  const faltaram = lista.filter((i) => i.estado === 'faltou' && setoresVisiveis.includes(i.setor));

  return (
    <>
      <div className="topo">
        <div className="pilha-p">
          <Link href={perfil.admin ? '/lideranca' : '/eventos'} className="small muted">{perfil.admin ? 'Visão da liderança' : 'Eventos'}</Link>
          <h1 className="titulo">{ev.nome}</h1>
          <span className="linha" style={{ gap: 8 }}>
            {ev.tipo ? <span className="pill t-gray">{ev.tipo}</span> : null}
            <span className="pill t-gray">{fmtPeriodo(ev)}</span>
            {ev.local ? <span className="small muted">{ev.local}</span> : null}
            <span className={'pill t-' + momento.cor}>{momento.nome}</span>
          </span>
        </div>
        {podeGerir ? (
          <details className="menu-acoes">
            <summary className="btn btn-sec">Editar evento</summary>
            <form action={editarEvento} className="card menu-acoes-caixa">
              <input type="hidden" name="id" value={ev.id} />
              <div className="campo"><label htmlFor="e-nome">Nome</label><input id="e-nome" name="nome" defaultValue={ev.nome} required /></div>
              <div className="campo">
                <label htmlFor="e-tipo">Tipo</label>
                <select id="e-tipo" name="tipo" defaultValue={ev.tipo || ''}>
                  <option value="">—</option>
                  {TIPOS_EVENTO.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-grid">
                <div className="campo"><label htmlFor="e-ini">Início</label><input id="e-ini" name="data_inicio" type="date" defaultValue={ev.data_inicio || ''} style={{ colorScheme: 'dark' }} /></div>
                <div className="campo"><label htmlFor="e-fim">Fim</label><input id="e-fim" name="data_fim" type="date" defaultValue={ev.data_fim || ''} style={{ colorScheme: 'dark' }} /></div>
              </div>
              <div className="campo"><label htmlFor="e-local">Local</label><input id="e-local" name="local" defaultValue={ev.local || ''} /></div>
              <button type="submit" className="btn">Salvar</button>
            </form>
          </details>
        ) : null}
      </div>

      <div className="grid-kpi">
        <div className="kpi">
          <span className="muted">Andamento do checklist</span>
          <span className="valor">{geral.pct}%</span>
          <div className="barra"><span style={{ width: geral.pct + '%', background: 'var(--verde)' }} /></div>
        </div>
        <div className="kpi">
          <span className="muted">{realizado ? 'Ficaram sem marcar' : 'O que falta'}</span>
          <span className="valor">{geral.pendentes}</span>
          <span className="small muted">de {geral.total} itens</span>
        </div>
        <div className="kpi">
          <span className="muted">Faltou / deixou de ter</span>
          <span className={'valor' + (geral.faltou ? ' cor' : '')} style={geral.faltou ? { color: 'var(--coral)' } : undefined}>{geral.faltou}</span>
          <span className="small muted">marcado por cada setor</span>
        </div>
        <div className="kpi">
          <span className="muted">Avaliação do evento</span>
          <span className="valor">{ev.avaliacao_nota ?? '—'}</span>
          <span className="small muted">{ev.avaliacao_nota !== null && ev.avaliacao_nota !== undefined ? 'de 0 a 10' : 'ainda não avaliado'}</span>
        </div>
      </div>

      {pendentes.length || faltaram.length ? (
        <section className="card">
          <div className="entre">
            <h2 className="h2">{realizado ? 'O que faltou' : 'O que falta'}</h2>
            <span className="small muted">por setor</span>
          </div>
          <div className="falta-grade">
            {setoresVisiveis.map((s) => {
              const doSetor = [...faltaram, ...pendentes].filter((i) => i.setor === s);
              if (!doSetor.length) return null;
              return (
                <div key={s} className="pilha-p" style={{ gap: 6 }}>
                  <span className="linha" style={{ gap: 8 }}><SetorIcone slug={s} tamanho={24} /><b>{setorPorSlug(s).nome}</b><span className="small muted">{doSetor.length}</span></span>
                  {doSetor.slice(0, 6).map((i) => (
                    <span key={i.id} className="small" style={{ color: i.estado === 'faltou' ? 'var(--coral)' : 'var(--texto3)', paddingLeft: 32 }}>
                      {i.estado === 'faltou' ? 'Faltou: ' : ''}{i.titulo}
                    </span>
                  ))}
                  {doSetor.length > 6 ? <span className="small muted" style={{ paddingLeft: 32 }}>e mais {doSetor.length - 6}</span> : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : lista.length ? (
        <div className="aviso t-green">Checklist completo nos setores que você vê.</div>
      ) : null}

      <div className="grid-painel">
        {SETORES_EVENTO.map((s) =>
          setoresVisiveis.includes(s) ? (
            <ChecklistSetor
              key={s}
              eventoId={ev.id}
              setor={s}
              nomeSetor={setorPorSlug(s).nome}
              itens={lista.filter((i) => i.setor === s)}
              podeEditar
              realizado={realizado}
            />
          ) : (
            <section key={s} className="card" style={{ opacity: 0.6 }}>
              <span className="linha" style={{ gap: 10 }}><SetorIcone slug={s} tamanho={32} /><span className="h2">{setorPorSlug(s).nome}</span></span>
              <span className="small muted">Você não tem acesso ao checklist deste setor.</span>
            </section>
          ),
        )}
      </div>

      <form action={avaliarEvento} className="card" style={{ maxWidth: 900 }}>
        <input type="hidden" name="id" value={ev.id} />
        <div className="pilha-p">
          <h2 className="h2">Avaliação do evento</h2>
          <span className="small muted">
            {ev.avaliado_em
              ? `Avaliado por ${ev.avaliado_por || 'alguém do time'} em ${new Date(ev.avaliado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`
              : 'Depois do evento: a nota geral, o que funcionou e o que faltou ou deixou de ter.'}
          </span>
        </div>
        <div className="nps-notas" role="radiogroup" aria-label="Nota do evento de 0 a 10">
          {Array.from({ length: 11 }, (_, n) => (
            <label key={n} className="nps-nota">
              <input type="radio" name="nota" value={n} defaultChecked={ev.avaliacao_nota === n} disabled={!podeGerir} />
              <span>{n}</span>
            </label>
          ))}
        </div>
        <div className="form-grid">
          <div className="campo"><label htmlFor="a-ok">O que funcionou</label><textarea id="a-ok" name="avaliacao_ok" rows={4} defaultValue={ev.avaliacao_ok || ''} disabled={!podeGerir} /></div>
          <div className="campo"><label htmlFor="a-falta">O que faltou ou deixou de ter</label><textarea id="a-falta" name="avaliacao_faltou" rows={4} defaultValue={ev.avaliacao_faltou || ''} disabled={!podeGerir} /></div>
        </div>
        {podeGerir ? <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>Salvar avaliação</button> : null}
      </form>

      {podeGerir ? (
        <form action={excluirEvento}>
          <input type="hidden" name="id" value={ev.id} />
          <BotaoConfirmar pergunta={`Excluir o evento ${ev.nome} e todo o checklist dele?`}>Excluir evento</BotaoConfirmar>
        </form>
      ) : null}
    </>
  );
}
