import { createClient } from '@/lib/supabase/server';
import { TIPOS_REUNIAO } from '@/lib/rh';
import { criarReuniao, removerReuniao, salvarAta } from '@/app/actions-rh';
import SetorIcone from '@/components/SetorIcone';
import BotaoConfirmar from '@/components/BotaoConfirmar';

const tz = { timeZone: 'America/Sao_Paulo' };
const quando = (d) =>
  new Date(d).toLocaleDateString('pt-BR', { ...tz, weekday: 'short', day: '2-digit', month: '2-digit' }) +
  ' · ' +
  new Date(d).toLocaleTimeString('pt-BR', { ...tz, hour: '2-digit', minute: '2-digit' });

function Reuniao({ r, pessoaNome, passada }) {
  return (
    <details className="card reuniao">
      <summary className="entre" style={{ cursor: 'pointer' }}>
        <span className="pilha-p" style={{ gap: 2, minWidth: 0 }}>
          <span style={{ fontWeight: 600 }}>{r.titulo}</span>
          <span className="small muted" style={{ textTransform: 'capitalize' }}>
            {quando(r.data)}{pessoaNome ? ' · com ' + pessoaNome : ''}{r.participantes ? ' · ' + r.participantes : ''}
          </span>
        </span>
        <span className="linha" style={{ gap: 6 }}>
          <span className="pill t-gray">{r.tipo}</span>
          {passada ? <span className={'pill ' + (r.ata ? 't-green' : 't-amber')}>{r.ata ? 'Com ata' : 'Sem ata'}</span> : null}
        </span>
      </summary>
      <form action={salvarAta} className="pilha" style={{ marginTop: 6 }}>
        <input type="hidden" name="id" value={r.id} />
        <div className="form-grid">
          <div className="campo"><label htmlFor={'pa' + r.id}>Pauta</label><textarea id={'pa' + r.id} name="pauta" rows={4} defaultValue={r.pauta || ''} /></div>
          <div className="campo"><label htmlFor={'at' + r.id}>Ata: decisões e combinados</label><textarea id={'at' + r.id} name="ata" rows={4} defaultValue={r.ata || ''} placeholder="O que foi decidido, quem faz e até quando" /></div>
        </div>
        <div className="entre">
          <button type="submit" className="btn btn-p">Salvar</button>
          <BotaoConfirmar pergunta="Excluir esta reunião?" formAction={removerReuniao}>Excluir reunião</BotaoConfirmar>
        </div>
      </form>
    </details>
  );
}

export default async function Reunioes() {
  const supabase = createClient();
  const [{ data: reunioes, error }, { data: pessoas }] = await Promise.all([
    supabase.from('rh_reunioes').select('*').order('data', { ascending: true }),
    supabase.from('rh_pessoas').select('id, nome').eq('ativo', true).order('nome'),
  ]);
  if (error) return <div className="aviso t-amber">Falta ativar o RH: rode o arquivo supabase/eventos-rh.sql no SQL Editor do Supabase.</div>;
  const agora = new Date();
  const lista = reunioes || [];
  const proximas = lista.filter((r) => new Date(r.data) >= new Date(agora.getTime() - 2 * 3600 * 1000));
  const passadas = lista.filter((r) => new Date(r.data) < new Date(agora.getTime() - 2 * 3600 * 1000)).reverse();
  const nome = (id) => (pessoas || []).find((p) => p.id === id)?.nome;
  const semAta = passadas.filter((r) => !r.ata).length;

  return (
    <>
      <div className="topo">
        <div className="pilha-p">
          <span className="selo"><SetorIcone slug="rh" tamanho={24} />RH</span>
          <h1 className="titulo">Reuniões</h1>
          <span className="small" style={{ color: 'var(--texto3)' }}>1:1, feedbacks, reuniões de equipe e alinhamentos, com pauta e ata.</span>
        </div>
      </div>

      <div className="grid-kpi">
        <div className="kpi"><span className="muted">Próximas</span><span className="valor">{proximas.length}</span><span className="small muted">marcadas</span></div>
        <div className="kpi"><span className="muted">Realizadas</span><span className="valor">{passadas.length}</span><span className="small muted">no histórico</span></div>
        <div className="kpi"><span className="muted">Sem ata</span><span className={'valor' + (semAta ? ' cor' : '')} style={semAta ? { color: 'var(--amber)' } : undefined}>{semAta}</span><span className="small muted">reuniões já feitas</span></div>
      </div>

      <details className="card" style={{ maxWidth: 960 }}>
        <summary className="h2" style={{ cursor: 'pointer' }}>+ Marcar reunião</summary>
        <form action={criarReuniao} className="pilha" style={{ marginTop: 14 }}>
          <div className="form-grid">
            <div className="campo"><label htmlFor="r-tit">Título *</label><input id="r-tit" name="titulo" required placeholder="Ex.: 1:1 com a Tati" /></div>
            <div className="campo">
              <label htmlFor="r-tipo">Tipo</label>
              <select id="r-tipo" name="tipo" defaultValue="Equipe">{TIPOS_REUNIAO.map((t) => <option key={t}>{t}</option>)}</select>
            </div>
            <div className="campo"><label htmlFor="r-data">Data e hora *</label><input id="r-data" name="data" type="datetime-local" required style={{ colorScheme: 'dark' }} /></div>
            <div className="campo">
              <label htmlFor="r-p">Com quem (se for 1:1 ou feedback)</label>
              <select id="r-p" name="pessoa_id" defaultValue="">
                <option value="">—</option>
                {(pessoas || []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="campo inteiro"><label htmlFor="r-part">Participantes</label><input id="r-part" name="participantes" placeholder="Ex.: Lilian, João, Guilherme" /></div>
            <div className="campo inteiro"><label htmlFor="r-pauta">Pauta</label><textarea id="r-pauta" name="pauta" rows={3} /></div>
          </div>
          <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>Marcar reunião</button>
        </form>
      </details>

      <section className="pilha" style={{ gap: 10 }}>
        <h2 className="h2">Próximas</h2>
        {proximas.length ? proximas.map((r) => <Reuniao key={r.id} r={r} pessoaNome={nome(r.pessoa_id)} />) : <div className="vazio">Nenhuma reunião marcada.</div>}
      </section>

      {passadas.length ? (
        <section className="pilha" style={{ gap: 10 }}>
          <h2 className="h2">Já aconteceram</h2>
          {passadas.slice(0, 40).map((r) => <Reuniao key={r.id} r={r} pessoaNome={nome(r.pessoa_id)} passada />)}
        </section>
      ) : null}
    </>
  );
}
