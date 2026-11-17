'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react';
import { salvarPessoa, tirarPessoa } from '@/app/actions-rh';
import { AREAS_RH, montarArvore } from '@/lib/rh';

const RASCUNHO = 'rascunho';
const VAZIO = { nome: '', cargo: '', area: '', gestor_id: '', email: '', telefone: '', admissao: '' };
const daPessoa = (p) => ({ ...VAZIO, ...Object.fromEntries(Object.keys(VAZIO).map((k) => [k, p[k] ?? ''])) });
const ehDiretoria = (p) => (p.area || '').toLowerCase() === 'diretoria';

// Todos que estão abaixo de alguém (para não deixar escolher um subordinado como gestor)
function abaixoDe(id, pessoas) {
  const fora = new Set([id]);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const p of pessoas) {
      if (p.gestor_id && fora.has(p.gestor_id) && !fora.has(p.id)) {
        fora.add(p.id);
        mudou = true;
      }
    }
  }
  return fora;
}

export default function Organograma({ pessoas: iniciais }) {
  const [pessoas, setPessoas] = useState(iniciais);
  const [modo, setModo] = useState({ tipo: 'novo' }); // { tipo: 'novo' } | { tipo: 'editar', id }
  const [form, setForm] = useState(() => ({ ...VAZIO, area: iniciais.length ? '' : 'Diretoria' }));
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [salvando, iniciar] = useTransition();
  const nomeRef = useRef(null);

  useEffect(() => setPessoas(iniciais), [iniciais]);

  const editandoId = modo.tipo === 'editar' ? modo.id : null;
  const digitou = Object.values(form).some((v) => String(v).trim());

  // O que aparece no desenho: as pessoas salvas + o que está sendo digitado agora
  const aoVivo = useMemo(() => {
    const dados = { ...form, gestor_id: form.gestor_id || null };
    if (editandoId) return pessoas.map((p) => (p.id === editandoId ? { ...p, ...dados } : p));
    if (!form.nome.trim() && !form.cargo.trim()) return pessoas;
    return [...pessoas, { ...dados, id: RASCUNHO, ordem: 1e9, nome: form.nome.trim() || 'Nova pessoa' }];
  }, [pessoas, form, editandoId]);
  const arvore = useMemo(() => montarArvore(aoVivo), [aoVivo]);

  const proibidos = useMemo(() => (editandoId ? abaixoDe(editandoId, pessoas) : new Set()), [editandoId, pessoas]);

  function campo(k) {
    return { value: form[k], onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })) };
  }

  function focarNome() {
    requestAnimationFrame(() => nomeRef.current?.focus());
  }

  function novo(gestor) {
    setErro('');
    setModo({ tipo: 'novo' });
    const chefe = pessoas.find((p) => p.id === gestor);
    setForm({ ...VAZIO, gestor_id: gestor || '', area: chefe && !ehDiretoria(chefe) ? chefe.area || '' : gestor ? '' : 'Diretoria' });
    focarNome();
  }

  function editar(id) {
    if (id === RASCUNHO) return focarNome();
    const p = pessoas.find((x) => x.id === id);
    if (!p) return;
    setErro('');
    setModo({ tipo: 'editar', id });
    setForm(daPessoa(p));
  }

  function aviso(t) {
    setOk(t);
    setTimeout(() => setOk(''), 2500);
  }

  function salvar(e) {
    e.preventDefault();
    if (!form.nome.trim()) {
      setErro('Preencha o nome.');
      return focarNome();
    }
    setErro('');
    const id = editandoId;
    iniciar(async () => {
      try {
        const salva = await salvarPessoa({ id, dados: form });
        setPessoas((l) => (id ? l.map((p) => (p.id === id ? salva : p)) : [...l, salva]));
        if (id) {
          aviso('Alterações salvas.');
          setModo({ tipo: 'novo' });
          setForm({ ...VAZIO });
        } else {
          aviso(`${salva.nome} entrou no organograma.`);
          // Já deixa pronto para cadastrar a próxima pessoa no mesmo lugar
          setForm({ ...VAZIO, gestor_id: form.gestor_id, area: form.area });
          focarNome();
        }
      } catch (e2) {
        setErro(e2?.message || 'Não foi possível salvar.');
      }
    });
  }

  function remover() {
    const p = pessoas.find((x) => x.id === editandoId);
    if (!p || !window.confirm(`Tirar ${p.nome} do organograma? Quem reporta a ela passa a reportar ao gestor dela.`)) return;
    iniciar(async () => {
      try {
        await tirarPessoa({ id: p.id });
        setPessoas((l) => l.filter((x) => x.id !== p.id).map((x) => (x.gestor_id === p.id ? { ...x, gestor_id: p.gestor_id } : x)));
        setModo({ tipo: 'novo' });
        setForm({ ...VAZIO });
        aviso(`${p.nome} saiu do organograma.`);
      } catch (e2) {
        setErro(e2?.message || 'Não foi possível tirar.');
      }
    });
  }

  const editando = editandoId ? pessoas.find((p) => p.id === editandoId) : null;
  const selecionado = editandoId || (digitou && (form.nome.trim() || form.cargo.trim()) ? RASCUNHO : null);

  return (
    <div className="org-layout">
      <section className="card org-quadro" aria-label="Organograma">
        {arvore.length ? (
          <Desenho arvore={arvore} selecionado={selecionado} onEditar={editar} onNovo={novo} />
        ) : (
          <div className="org-vazio">
            <span className="h2">Comece pela diretoria</span>
            <span className="small muted">Preencha o nome ao lado e a pessoa já aparece aqui. Depois é só ir descendo: quem reporta a quem.</span>
          </div>
        )}
      </section>

      <aside className="card org-lado">
        <form onSubmit={salvar} className="pilha-p" style={{ gap: 14 }}>
          <div className="entre">
            <span className="h2">{editando ? 'Editar pessoa' : '+ Adicionar pessoa'}</span>
            {editando || digitou ? (
              <button type="button" className="btn-link" onClick={() => novo('')}>{editando ? 'Cancelar' : 'Limpar'}</button>
            ) : null}
          </div>
          <span className="small muted" style={{ marginTop: -6 }}>
            {editando ? 'As mudanças aparecem no desenho na hora. Salve para gravar.' : 'Enquanto você digita, a pessoa já aparece no desenho, no lugar certo.'}
          </span>

          <div className="campo"><label htmlFor="og-nome">Nome *</label><input id="og-nome" ref={nomeRef} maxLength={120} autoComplete="off" {...campo('nome')} /></div>
          <div className="campo"><label htmlFor="og-cargo">Cargo</label><input id="og-cargo" maxLength={120} placeholder="Ex.: Diretora, Gerente de Vendas" autoComplete="off" {...campo('cargo')} /></div>
          <div className="campo">
            <label htmlFor="og-gestor">Reporta a</label>
            <select id="og-gestor" {...campo('gestor_id')}>
              <option value="">Ninguém (topo, diretoria)</option>
              {pessoas.filter((x) => !proibidos.has(x.id)).map((x) => <option key={x.id} value={x.id}>{x.nome}{x.cargo ? ' · ' + x.cargo : ''}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="og-area">Área</label>
            <input id="og-area" list="areas-rh" maxLength={80} autoComplete="off" {...campo('area')} />
            <datalist id="areas-rh">{AREAS_RH.map((a) => <option key={a} value={a} />)}</datalist>
          </div>

          <details className="org-mais-campos" open={Boolean(form.email || form.telefone || form.admissao) || undefined}>
            <summary className="small">Contato e admissão</summary>
            <div className="pilha-p" style={{ gap: 12, marginTop: 12 }}>
              <div className="campo"><label htmlFor="og-email">E-mail</label><input id="og-email" type="email" maxLength={160} {...campo('email')} /></div>
              <div className="campo"><label htmlFor="og-tel">Telefone</label><input id="og-tel" maxLength={40} {...campo('telefone')} /></div>
              <div className="campo"><label htmlFor="og-adm">Admissão</label><input id="og-adm" type="date" style={{ colorScheme: 'dark' }} {...campo('admissao')} /></div>
            </div>
          </details>

          {erro ? <div className="aviso t-coral">{erro}</div> : null}
          {ok ? <div className="small" style={{ color: 'var(--verde)' }} role="status">{ok}</div> : null}

          <div className="entre" style={{ gap: 12, flexWrap: 'wrap' }}>
            <button type="submit" className="btn" disabled={salvando || !form.nome.trim()}>
              {salvando ? 'Salvando…' : editando ? 'Salvar' : 'Adicionar ao organograma'}
            </button>
            {editando ? <button type="button" className="btn-perigo" onClick={remover} disabled={salvando}>Tirar do organograma</button> : null}
          </div>
        </form>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- Desenho

// Ajusta o desenho à largura da tela (sem rolar para o lado). Se ficar pequeno demais, vira lista.
function Desenho({ arvore, selecionado, onEditar, onNovo }) {
  const caixa = useRef(null);
  const palco = useRef(null);
  const [medida, setMedida] = useState({ escala: 1, altura: 0, x: 0, lista: false });

  useLayoutEffect(() => {
    const medir = () => {
      const c = caixa.current;
      const p = palco.current;
      if (!c || !p) return;
      const largura = c.clientWidth;
      const w = p.offsetWidth;
      const h = p.offsetHeight;
      const escala = Math.min(1, largura / w);
      const lista = largura < 620 || escala < 0.55;
      setMedida({ escala, altura: lista ? 0 : h * escala, x: Math.max(0, (largura - w * escala) / 2), lista });
    };
    medir();
    const ro = new ResizeObserver(medir);
    if (caixa.current) ro.observe(caixa.current);
    if (palco.current) ro.observe(palco.current);
    return () => ro.disconnect();
  }, []);

  const props = { selecionado, onEditar, onNovo };
  return (
    <>
      <div ref={caixa} className="oc-caixa" style={{ height: medida.altura }}>
        <div
          ref={palco}
          className={'oc-palco' + (medida.lista ? ' oculto' : '')}
          style={{ transform: `translateX(${medida.x}px) scale(${medida.escala})` }}
          aria-hidden={medida.lista || undefined}
        >
          <ul className="oc-nivel oc-raiz">
            {arvore.map((p) => <NoArvore key={p.id} p={p} {...props} />)}
          </ul>
        </div>
      </div>
      {medida.lista ? (
        <ul className="org-arvore">
          {arvore.map((p) => <NoLista key={p.id} p={p} {...props} />)}
        </ul>
      ) : null}
    </>
  );
}

function Cartao({ p, selecionado, onEditar, onNovo, compacto }) {
  const rascunho = p.id === RASCUNHO;
  const classe = ['oc-card', ehDiretoria(p) ? 'diretoria' : '', selecionado === p.id ? 'sel' : '', rascunho ? 'rascunho' : '', compacto ? 'compacto' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className="oc-cartao">
      <button type="button" className={classe} onClick={() => onEditar(p.id)} aria-label={`${p.nome}${p.cargo ? ', ' + p.cargo : ''}. Editar`}>
        <span className="oc-nome">{p.nome}</span>
        <span className="oc-cargo">{p.cargo || (rascunho ? 'Digitando…' : 'Sem cargo')}</span>
        {p.area ? <span className="oc-area">{p.area}</span> : null}
      </button>
      {!rascunho ? (
        <button type="button" className="oc-mais" onClick={() => onNovo(p.id)} aria-label={`Adicionar pessoa abaixo de ${p.nome}`} title={`Adicionar abaixo de ${p.nome}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      ) : null}
    </div>
  );
}

function NoArvore({ p, ...props }) {
  const filhos = p.filhos;
  // Muitos liderados sem ninguém abaixo: empilha numa caixa para o desenho não ficar largo demais
  const empilhar = filhos.length >= 3 && filhos.every((f) => !f.filhos.length);
  return (
    <li className="oc-li">
      <Cartao p={p} {...props} />
      {filhos.length && empilhar ? (
        <div className="oc-grupo-wrap">
          <ul className="oc-grupo">
            {filhos.map((f) => <li key={f.id}><Cartao p={f} compacto {...props} /></li>)}
          </ul>
        </div>
      ) : filhos.length ? (
        <ul className="oc-nivel">
          {filhos.map((f) => <NoArvore key={f.id} p={f} {...props} />)}
        </ul>
      ) : null}
    </li>
  );
}

function NoLista({ p, ...props }) {
  return (
    <li className="org-no">
      <Cartao p={p} compacto {...props} />
      {p.filhos.length ? (
        <ul className="org-filhos">
          {p.filhos.map((f) => <NoLista key={f.id} p={f} {...props} />)}
        </ul>
      ) : null}
    </li>
  );
}
