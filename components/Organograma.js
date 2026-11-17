'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react';
import { moverNoOrganograma, organizarAutomatico, salvarPessoa, tirarPessoa } from '@/app/actions-rh';
import { AREAS_RH, montarArvore } from '@/lib/rh';

const RASCUNHO = 'rascunho';
const VAZIO = { nome: '', cargo: '', area: '', gestor_id: '', email: '', telefone: '', admissao: '' };
const daPessoa = (p) => ({ ...VAZIO, ...Object.fromEntries(Object.keys(VAZIO).map((k) => [k, p[k] ?? ''])) });
const ehDiretoria = (p) => (p.area || '').toLowerCase() === 'diretoria';

// Medidas do quadro livre (em pixels do desenho)
const W = 188; // largura do cartão
const H = 80; // altura do cartão
const GX = 28; // espaço entre cartões lado a lado
const LINHA = 150; // distância entre um nível e o de baixo
const MARGEM = 24;
const GRADE = 10; // os cartões "encaixam" de 10 em 10 px para ficar alinhado

// Todos que estão abaixo de alguém (inclui a própria pessoa)
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

// Arrumação automática: cada equipe centralizada embaixo de quem ela reporta
function layoutAutomatico(arvore) {
  const larg = {};
  const largura = (no) => {
    if (larg[no.id] !== undefined) return larg[no.id];
    const filhos = no.filhos.reduce((s, f) => s + largura(f), 0) + GX * Math.max(0, no.filhos.length - 1);
    return (larg[no.id] = Math.max(W, filhos));
  };
  const pos = {};
  const colocar = (no, x0, y) => {
    const w = largura(no);
    pos[no.id] = { x: x0 + (w - W) / 2, y };
    const total = no.filhos.reduce((s, f) => s + largura(f), 0) + GX * Math.max(0, no.filhos.length - 1);
    let x = x0 + (w - total) / 2;
    for (const f of no.filhos) {
      colocar(f, x, y + LINHA);
      x += largura(f) + GX;
    }
  };
  let x = 0;
  for (const r of arvore) {
    colocar(r, x, 0);
    x += largura(r) + GX * 2;
  }
  return pos;
}

// Onde cada cartão fica: posição salva; sem posição salva, segue o gestor pela arrumação automática
function posicoes(arvore) {
  const auto = layoutAutomatico(arvore);
  const pos = {};
  const visitar = (no, pai) => {
    if (no.pos_x != null && no.pos_y != null) pos[no.id] = { x: no.pos_x, y: no.pos_y };
    else if (pai) pos[no.id] = { x: pos[pai.id].x + auto[no.id].x - auto[pai.id].x, y: pos[pai.id].y + auto[no.id].y - auto[pai.id].y };
    else pos[no.id] = auto[no.id];
    no.filhos.forEach((f) => visitar(f, no));
  };
  arvore.forEach((r) => visitar(r, null));
  return pos;
}

// Linha do gestor (embaixo do cartão) até a pessoa (em cima do cartão), em ângulo reto com cantos arredondados
function caminho(a, b) {
  const x1 = a.x + W / 2;
  const y1 = a.y + H;
  const x2 = b.x + W / 2;
  const y2 = b.y;
  if (y2 - y1 < 24) return `M ${x1} ${y1} C ${x1} ${y1 + 60}, ${x2} ${y2 - 60}, ${x2} ${y2}`;
  const m = y1 + (y2 - y1) / 2;
  const dx = x2 - x1;
  if (Math.abs(dx) < 1) return `M ${x1} ${y1} V ${y2}`;
  const d = Math.sign(dx);
  const r = Math.min(10, Math.abs(dx) / 2, m - y1);
  return `M ${x1} ${y1} V ${m - r} Q ${x1} ${m} ${x1 + d * r} ${m} H ${x2 - d * r} Q ${x2} ${m} ${x2} ${m + r} V ${y2}`;
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
        setPessoas((l) => (id ? l.map((p) => (p.id === id ? { ...p, ...salva } : p)) : [...l, salva]));
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

  // Arrastou no quadro: guarda as posições novas (e o novo gestor, se soltou em cima de alguém)
  function mover({ gestor, posicoes: novas }) {
    const antes = pessoas;
    const mapa = Object.fromEntries(novas.map((p) => [p.id, p]));
    setPessoas((l) =>
      l.map((p) => {
        let q = mapa[p.id] ? { ...p, pos_x: mapa[p.id].x, pos_y: mapa[p.id].y } : p;
        if (gestor && p.id === gestor.id) q = { ...q, gestor_id: gestor.gestor_id };
        return q;
      }),
    );
    if (gestor && editandoId === gestor.id) setForm((f) => ({ ...f, gestor_id: gestor.gestor_id || '' }));
    setErro('');
    iniciar(async () => {
      try {
        await moverNoOrganograma({ gestor, posicoes: novas });
        if (gestor) {
          const quem = antes.find((p) => p.id === gestor.id)?.nome;
          const chefe = antes.find((p) => p.id === gestor.gestor_id)?.nome;
          if (quem && chefe) aviso(`${quem} agora reporta a ${chefe}.`);
        }
      } catch (e2) {
        setPessoas(antes);
        setErro(e2?.message || 'Não foi possível mover.');
      }
    });
  }

  function arrumar() {
    if (!window.confirm('Voltar todo mundo para a arrumação automática? As posições que vocês arrastaram serão desfeitas.')) return;
    const antes = pessoas;
    setPessoas((l) => l.map((p) => ({ ...p, pos_x: null, pos_y: null })));
    iniciar(async () => {
      try {
        await organizarAutomatico();
      } catch (e2) {
        setPessoas(antes);
        setErro(e2?.message || 'Não foi possível organizar.');
      }
    });
  }

  const editando = editandoId ? pessoas.find((p) => p.id === editandoId) : null;
  const selecionado = editandoId || (digitou && (form.nome.trim() || form.cargo.trim()) ? RASCUNHO : null);
  const temPosicao = pessoas.some((p) => p.pos_x != null);

  return (
    <div className="org-layout">
      <section className="card org-quadro" aria-label="Organograma">
        {arvore.length ? (
          <>
            <div className="entre" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
              <span className="small muted">Arraste para mover. Solte em cima de alguém para passar a reportar a essa pessoa.</span>
              {temPosicao ? <button type="button" className="btn-link" onClick={arrumar}>Organizar automaticamente</button> : null}
            </div>
            <Quadro arvore={arvore} lista={aoVivo} selecionado={selecionado} onEditar={editar} onNovo={novo} onMover={mover} />
          </>
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

// ---------------------------------------------------------------- Quadro livre

function Quadro({ arvore, lista, selecionado, onEditar, onNovo, onMover }) {
  const caixa = useRef(null);
  const [largura, setLargura] = useState(0);
  const [arrasto, setArrasto] = useState(null); // { id, ids, dx, dy, alvo }
  const ref = useRef(null);
  const vistaFixa = useRef(null);
  const ignorarClique = useRef(false);

  useLayoutEffect(() => {
    const medir = () => caixa.current && setLargura(caixa.current.clientWidth);
    medir();
    const ro = new ResizeObserver(medir);
    if (caixa.current) ro.observe(caixa.current);
    return () => ro.disconnect();
  }, []);

  const pos = useMemo(() => posicoes(arvore), [arvore]);
  const ids = useMemo(() => new Set(lista.map((p) => p.id)), [lista]);

  // Onde está cada cartão agora (somando o arrasto em andamento)
  const onde = (id) => {
    const p = pos[id];
    if (!p) return null;
    return arrasto?.ids.has(id) ? { x: p.x + arrasto.dx, y: p.y + arrasto.dy } : p;
  };

  // Enquadramento: cabe na largura da tela (fica parado enquanto arrasta, para não tremer)
  const vista = useMemo(() => {
    const v = Object.values(pos);
    const minX = Math.min(...v.map((p) => p.x));
    const minY = Math.min(...v.map((p) => p.y));
    const maxX = Math.max(...v.map((p) => p.x));
    const maxY = Math.max(...v.map((p) => p.y));
    const bw = maxX - minX + W + MARGEM * 2;
    const bh = maxY - minY + H + MARGEM * 2;
    const escala = largura ? Math.min(1, largura / bw) : 1;
    return { minX, minY, bw, bh, escala, tx: Math.max(0, (largura - bw * escala) / 2) };
  }, [pos, largura]);
  const v = arrasto && vistaFixa.current ? vistaFixa.current : vista;

  const lista2 = largura > 0 && largura < 620;

  function abaixo(id) {
    const fora = new Set([id]);
    let mudou = true;
    while (mudou) {
      mudou = false;
      for (const p of lista) {
        const pai = p.gestor_id && ids.has(p.gestor_id) ? p.gestor_id : null;
        if (pai && fora.has(pai) && !fora.has(p.id)) {
          fora.add(p.id);
          mudou = true;
        }
      }
    }
    return fora;
  }

  const eventos = (id) => ({
    onPointerDown: (e) => {
      if (e.button !== 0 || id === RASCUNHO) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      ref.current = { id, sx: e.clientX, sy: e.clientY, ativo: false, ids: abaixo(id), dx: 0, dy: 0, alvo: null };
    },
    onPointerMove: (e) => {
      const r = ref.current;
      if (!r || r.id !== id) return;
      const ex = (e.clientX - r.sx) / v.escala;
      const ey = (e.clientY - r.sy) / v.escala;
      if (!r.ativo) {
        if (Math.hypot(e.clientX - r.sx, e.clientY - r.sy) < 5) return;
        r.ativo = true;
        vistaFixa.current = vista;
      }
      const base = pos[id];
      r.dx = Math.round((base.x + ex) / GRADE) * GRADE - base.x;
      r.dy = Math.round((base.y + ey) / GRADE) * GRADE - base.y;
      // Está em cima de outra pessoa? (não vale soltar em cima de alguém da própria equipe abaixo)
      // Só conta se o cursor estiver bem no miolo do cartão (para dar para encostar um ao lado do outro)
      const el = document.elementsFromPoint(e.clientX, e.clientY).map((x) => x.closest?.('[data-pid]')).find((x) => x && !r.ids.has(x.dataset.pid) && x.dataset.pid !== RASCUNHO);
      let alvo = null;
      if (el) {
        const b = el.getBoundingClientRect();
        const fx = (e.clientX - b.left) / b.width;
        const fy = (e.clientY - b.top) / b.height;
        if (fx > 0.2 && fx < 0.8 && fy > 0.15 && fy < 0.85) alvo = el.dataset.pid;
      }
      r.alvo = alvo;
      setArrasto({ id, ids: r.ids, dx: r.dx, dy: r.dy, alvo: r.alvo });
    },
    onPointerUp: () => {
      const r = ref.current;
      ref.current = null;
      if (!r || !r.ativo) return;
      ignorarClique.current = true;
      let dx = r.dx;
      let dy = r.dy;
      let gestor = null;
      if (r.alvo && pos[r.alvo]) {
        // Soltou em cima de alguém: passa a reportar a ela e fica logo abaixo
        const t = pos[r.alvo];
        dx = t.x - pos[id].x;
        dy = t.y + LINHA - pos[id].y;
        gestor = { id, gestor_id: r.alvo };
      }
      setArrasto(null);
      vistaFixa.current = null;
      const novas = [...r.ids].filter((x) => pos[x] && x !== RASCUNHO).map((x) => ({ id: x, x: Math.round(pos[x].x + dx), y: Math.round(pos[x].y + dy) }));
      if (dx || dy || gestor) onMover({ gestor, posicoes: novas });
    },
    onPointerCancel: () => {
      ref.current = null;
      vistaFixa.current = null;
      setArrasto(null);
    },
    onClick: () => {
      if (ignorarClique.current) {
        ignorarClique.current = false;
        return;
      }
      onEditar(id);
    },
  });

  if (lista2) {
    return (
      <div ref={caixa}>
        <ul className="org-arvore">
          {arvore.map((p) => <NoLista key={p.id} p={p} selecionado={selecionado} onEditar={onEditar} onNovo={onNovo} />)}
        </ul>
      </div>
    );
  }

  const ox = MARGEM - v.minX;
  const oy = MARGEM - v.minY;
  const nomeAlvo = arrasto?.alvo ? lista.find((p) => p.id === arrasto.alvo)?.nome?.split(' ')[0] : null;

  return (
    <div ref={caixa} className="oc-livre" style={{ height: v.bh * v.escala }}>
      <div
        className={'oc-livre-palco' + (arrasto ? ' arrastando' : '')}
        style={{ width: v.bw, height: v.bh, transform: `translateX(${v.tx}px) scale(${v.escala})` }}
      >
        <svg className="oc-linhas" width={v.bw} height={v.bh} aria-hidden="true">
          {lista.map((p) => {
            if (!p.gestor_id || !ids.has(p.gestor_id) || p.gestor_id === p.id) return null;
            const a = onde(p.gestor_id);
            const b = onde(p.id);
            if (!a || !b) return null;
            return <path key={p.id} d={caminho({ x: a.x + ox, y: a.y + oy }, { x: b.x + ox, y: b.y + oy })} />;
          })}
        </svg>
        {lista.map((p) => {
          const o = onde(p.id);
          if (!o) return null;
          const movendo = arrasto?.ids.has(p.id);
          const alvo = arrasto?.alvo === p.id;
          return (
            <div
              key={p.id}
              data-pid={p.id}
              className={'oc-cartao oc-solto' + (movendo ? ' movendo' : '') + (arrasto?.id === p.id ? ' pegando' : '')}
              style={{ left: o.x + ox, top: o.y + oy }}
            >
              {alvo ? <span className="oc-dica">Reportar a {nomeAlvo}</span> : null}
              <Cartao p={p} selecionado={selecionado} onNovo={onNovo} alvo={alvo} eventos={eventos(p.id)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Cartao({ p, selecionado, onEditar, onNovo, compacto, alvo, eventos }) {
  const rascunho = p.id === RASCUNHO;
  const classe = [
    'oc-card',
    ehDiretoria(p) ? 'diretoria' : '',
    selecionado === p.id ? 'sel' : '',
    rascunho ? 'rascunho' : '',
    compacto ? 'compacto' : 'fixo',
    alvo ? 'alvo-dentro' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <>
      <button
        type="button"
        className={classe}
        {...(eventos || { onClick: () => onEditar(p.id) })}
        aria-label={`${p.nome}${p.cargo ? ', ' + p.cargo : ''}. Editar`}
      >
        <span className="oc-nome">{p.nome}</span>
        <span className="oc-cargo">{p.cargo || (rascunho ? 'Digitando…' : 'Sem cargo')}</span>
        {p.area ? <span className="oc-area">{p.area}</span> : null}
      </button>
      {!rascunho ? (
        <button type="button" className="oc-mais" onClick={() => onNovo(p.id)} aria-label={`Adicionar pessoa abaixo de ${p.nome}`} title={`Adicionar abaixo de ${p.nome}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      ) : null}
    </>
  );
}

function NoLista({ p, ...props }) {
  return (
    <li className="org-no">
      <div className="oc-cartao">
        <Cartao p={p} compacto {...props} />
      </div>
      {p.filhos.length ? (
        <ul className="org-filhos">
          {p.filhos.map((f) => <NoLista key={f.id} p={f} {...props} />)}
        </ul>
      ) : null}
    </li>
  );
}
