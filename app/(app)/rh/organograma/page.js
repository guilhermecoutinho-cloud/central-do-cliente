import { createClient } from '@/lib/supabase/server';
import { AREAS_RH, montarArvore } from '@/lib/rh';
import { criarPessoa, editarPessoa, removerPessoa } from '@/app/actions-rh';
import SetorIcone from '@/components/SetorIcone';
import BotaoConfirmar from '@/components/BotaoConfirmar';

function CamposPessoa({ p = {}, pessoas, prefixo }) {
  return (
    <div className="form-grid">
      <div className="campo"><label htmlFor={prefixo + 'nome'}>Nome *</label><input id={prefixo + 'nome'} name="nome" required defaultValue={p.nome || ''} /></div>
      <div className="campo"><label htmlFor={prefixo + 'cargo'}>Cargo</label><input id={prefixo + 'cargo'} name="cargo" defaultValue={p.cargo || ''} placeholder="Ex.: Analista de Marketing" /></div>
      <div className="campo">
        <label htmlFor={prefixo + 'area'}>Área</label>
        <input id={prefixo + 'area'} name="area" list="areas-rh" defaultValue={p.area || ''} />
      </div>
      <div className="campo">
        <label htmlFor={prefixo + 'gestor'}>Reporta a</label>
        <select id={prefixo + 'gestor'} name="gestor_id" defaultValue={p.gestor_id || ''}>
          <option value="">Ninguém (topo do organograma)</option>
          {pessoas.filter((x) => x.id !== p.id).map((x) => <option key={x.id} value={x.id}>{x.nome}{x.cargo ? ' · ' + x.cargo : ''}</option>)}
        </select>
      </div>
      <div className="campo"><label htmlFor={prefixo + 'email'}>E-mail</label><input id={prefixo + 'email'} name="email" type="email" defaultValue={p.email || ''} /></div>
      <div className="campo"><label htmlFor={prefixo + 'tel'}>Telefone</label><input id={prefixo + 'tel'} name="telefone" defaultValue={p.telefone || ''} /></div>
      <div className="campo"><label htmlFor={prefixo + 'adm'}>Admissão</label><input id={prefixo + 'adm'} name="admissao" type="date" defaultValue={p.admissao || ''} style={{ colorScheme: 'dark' }} /></div>
    </div>
  );
}

function No({ p, pessoas, nivel }) {
  return (
    <li className="org-no">
      <div className={'org-cartao' + (nivel === 0 ? ' topo-org' : '')}>
        <div className="pilha-p" style={{ gap: 2, minWidth: 0, flex: 1 }}>
          <span style={{ fontWeight: 700 }}>{p.nome}</span>
          <span className="small" style={{ color: 'var(--texto3)' }}>{p.cargo || 'Sem cargo'}</span>
        </div>
        {p.area ? <span className="pill t-gray">{p.area}</span> : null}
        {p.filhos.length ? <span className="small muted" title="Pessoas que reportam a ela">{p.filhos.length} {p.filhos.length === 1 ? 'liderado' : 'liderados'}</span> : null}
        <details className="menu-acoes">
          <summary className="btn-link">Editar</summary>
          <form action={editarPessoa} className="card menu-acoes-caixa" style={{ width: 'min(560px, 90vw)' }}>
            <input type="hidden" name="id" value={p.id} />
            <CamposPessoa p={p} pessoas={pessoas} prefixo={'e' + p.id.slice(0, 6)} />
            <div className="entre">
              <button type="submit" className="btn">Salvar</button>
              <BotaoConfirmar pergunta={`Tirar ${p.nome} do organograma?`} formAction={removerPessoa}>Tirar do organograma</BotaoConfirmar>
            </div>
          </form>
        </details>
      </div>
      {p.filhos.length ? (
        <ul className="org-filhos">
          {p.filhos.map((f) => <No key={f.id} p={f} pessoas={pessoas} nivel={nivel + 1} />)}
        </ul>
      ) : null}
    </li>
  );
}

export default async function Organograma() {
  const { data: pessoas, error } = await createClient().from('rh_pessoas').select('*').eq('ativo', true).order('ordem').order('nome');
  if (error) return <div className="aviso t-amber">Falta ativar o RH: rode o arquivo supabase/eventos-rh.sql no SQL Editor do Supabase.</div>;
  const lista = pessoas || [];
  const arvore = montarArvore(lista);
  const areas = [...new Set(lista.map((p) => p.area).filter(Boolean))];

  return (
    <>
      <div className="topo">
        <div className="pilha-p">
          <span className="selo"><SetorIcone slug="rh" tamanho={24} />RH</span>
          <h1 className="titulo">Organograma</h1>
          <span className="small" style={{ color: 'var(--texto3)' }}>{lista.length} {lista.length === 1 ? 'pessoa' : 'pessoas'}{areas.length ? ` em ${areas.length} ${areas.length === 1 ? 'área' : 'áreas'}` : ''}</span>
        </div>
      </div>
      <datalist id="areas-rh">{AREAS_RH.map((a) => <option key={a} value={a} />)}</datalist>

      <section className="card">
        {arvore.length ? (
          <ul className="org-arvore">{arvore.map((p) => <No key={p.id} p={p} pessoas={lista} nivel={0} />)}</ul>
        ) : (
          <div className="vazio" style={{ padding: 24, fontSize: 14 }}>Comece cadastrando quem está no topo (por exemplo, a diretoria) e depois quem reporta a cada um.</div>
        )}
      </section>

      <details className="card" style={{ maxWidth: 900 }} open={!lista.length}>
        <summary className="h2" style={{ cursor: 'pointer' }}>+ Adicionar pessoa</summary>
        <form action={criarPessoa} className="pilha" style={{ marginTop: 14 }}>
          <CamposPessoa pessoas={lista} prefixo="n" />
          <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>Adicionar ao organograma</button>
        </form>
      </details>
    </>
  );
}
