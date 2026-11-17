'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { atualizarCompra, comentarCompra, criarCompra, excluirCompra, listarComentarios } from '@/app/actions-compras';
import { ETAPAS_COMPRA, fmtReal } from '@/lib/compras';
import ListaIncremental from './ListaIncremental';

// Quadro de compras: colunas por etapa, arrastar para mudar de etapa, clicar para ver e editar.
export default function QuadroCompras({ compras: iniciais, eventos, equipe, eventoFiltro }) {
  const [compras, setCompras] = useState(iniciais);
  const [aberta, setAberta] = useState(null);
  const [arrastando, setArrastando] = useState(null);
  const [alvo, setAlvo] = useState(null);
  const [nova, setNova] = useState('');
  const [erro, setErro] = useState('');
  const [, iniciar] = useTransition();

  useEffect(() => setCompras(iniciais), [iniciais]);

  const nomeEvento = (id) => eventos.find((e) => e.id === id)?.nome || 'CAUP geral';
  const nomePessoa = (id) => equipe.find((p) => p.user_id === id)?.nome?.split(' ')[0];

  function rodar(fn, desfazer) {
    setErro('');
    iniciar(async () => {
      try {
        await fn();
      } catch (e) {
        if (desfazer) desfazer();
        setErro(e?.message || 'Não foi possível salvar.');
        setTimeout(() => setErro(''), 5000);
      }
    });
  }

  function mudar(id, dados) {
    const antes = compras.find((c) => c.id === id);
    setCompras((l) => l.map((c) => (c.id === id ? { ...c, ...dados } : c)));
    if (aberta?.id === id) setAberta((a) => ({ ...a, ...dados }));
    rodar(() => atualizarCompra({ id, dados }), () => setCompras((l) => l.map((c) => (c.id === id ? antes : c))));
  }

  function adicionar(e) {
    e.preventDefault();
    const titulo = nova.trim();
    if (!titulo) return;
    setNova('');
    const evento_id = eventoFiltro && eventoFiltro !== 'geral' ? eventoFiltro : null;
    const temp = { id: 'nova-' + Date.now(), titulo, etapa: 'orcamentos', evento_id, comentarios: 0 };
    setCompras((l) => [temp, ...l]);
    rodar(
      async () => {
        const criada = await criarCompra({ titulo, evento_id, etapa: 'orcamentos' });
        setCompras((l) => l.map((c) => (c.id === temp.id ? criada : c)));
      },
      () => setCompras((l) => l.filter((c) => c.id !== temp.id)),
    );
  }

  function soltar(etapa) {
    if (arrastando) {
      const c = compras.find((x) => x.id === arrastando);
      if (c && c.etapa !== etapa) mudar(c.id, { etapa });
    }
    setArrastando(null);
    setAlvo(null);
  }

  return (
    <>
      <div className="kanban-compras">
        {ETAPAS_COMPRA.map((et) => {
          const lista = compras.filter((c) => c.etapa === et.id);
          return (
            <div
              key={et.id}
              className={'k-col' + (alvo === et.id ? ' alvo' : '')}
              onDragOver={(e) => { e.preventDefault(); setAlvo(et.id); }}
              onDragLeave={() => setAlvo((a) => (a === et.id ? null : a))}
              onDrop={() => soltar(et.id)}
            >
              <div className={'k-topo t-' + et.cor}>
                <span>{et.nome}</span>
                <span>{lista.length}</span>
              </div>
              {et.id === 'orcamentos' ? (
                <form onSubmit={adicionar}>
                  <input className="input" value={nova} onChange={(e) => setNova(e.target.value)} placeholder="+ Nova compra" aria-label="Nova compra" style={{ padding: '9px 12px' }} />
                </form>
              ) : null}
              <ListaIncremental>
                {lista.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={'k-card compra-card' + (arrastando === c.id ? ' arrastando' : '')}
                    draggable={!String(c.id).startsWith('nova-')}
                    onDragStart={() => setArrastando(c.id)}
                    onDragEnd={() => { setArrastando(null); setAlvo(null); }}
                    onClick={() => !String(c.id).startsWith('nova-') && setAberta(c)}
                  >
                    <span style={{ fontWeight: 600, textAlign: 'left' }}>{c.titulo}</span>
                    {c.descricao ? <span className="small muted compra-desc">{c.descricao}</span> : null}
                    <span className="linha" style={{ gap: 6 }}>
                      {!eventoFiltro ? <span className="pill t-gray">{nomeEvento(c.evento_id)}</span> : null}
                      {c.quantidade ? <span className="small" style={{ color: 'var(--texto3)' }}>Qtd: {c.quantidade}</span> : null}
                      {c.valor ? <span className="small" style={{ color: 'var(--texto2)', fontWeight: 600 }}>{fmtReal(c.valor)}</span> : null}
                    </span>
                    {c.responsavel || c.comentarios ? (
                      <span className="entre small muted">
                        <span>{c.responsavel ? nomePessoa(c.responsavel) : ''}</span>
                        {c.comentarios ? <span>{c.comentarios} {c.comentarios === 1 ? 'comentário' : 'comentários'}</span> : null}
                      </span>
                    ) : null}
                  </button>
                ))}
              </ListaIncremental>
              {lista.length === 0 ? <span className="vazio">Arraste uma compra para cá</span> : null}
            </div>
          );
        })}
      </div>

      {aberta ? (
        <PainelCompra
          c={aberta}
          eventos={eventos}
          equipe={equipe}
          onMudar={(dados) => mudar(aberta.id, dados)}
          onFechar={() => setAberta(null)}
          onExcluir={() => {
            if (!window.confirm(`Excluir a compra "${aberta.titulo}"?`)) return;
            const c = aberta;
            setAberta(null);
            setCompras((l) => l.filter((x) => x.id !== c.id));
            rodar(() => excluirCompra({ id: c.id }), () => setCompras((l) => [c, ...l]));
          }}
          onComentou={() => setCompras((l) => l.map((x) => (x.id === aberta.id ? { ...x, comentarios: (x.comentarios || 0) + 1 } : x)))}
        />
      ) : null}
      {erro ? <div className="aviso t-coral toast" role="alert">{erro}</div> : null}
    </>
  );
}

function PainelCompra({ c, eventos, equipe, onMudar, onFechar, onExcluir, onComentou }) {
  const [comentarios, setComentarios] = useState(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  useEffect(() => {
    let vivo = true;
    listarComentarios({ compra_id: c.id }).then((l) => vivo && setComentarios(l)).catch(() => vivo && setComentarios([]));
    const esc = (e) => e.key === 'Escape' && fechar.current();
    window.addEventListener('keydown', esc);
    return () => {
      vivo = false;
      window.removeEventListener('keydown', esc);
    };
  }, [c.id]);

  const salvarSeMudou = (campo) => (e) => {
    const v = e.target.value;
    if ((c[campo] ?? '') + '' !== v) onMudar({ [campo]: v });
  };

  async function comentar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      const novo = await comentarCompra({ compra_id: c.id, texto });
      setComentarios((l) => [...(l || []), novo]);
      setTexto('');
      onComentou();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="painel-fundo" onClick={onFechar} role="presentation">
      <aside className="painel-lateral" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={'Compra: ' + c.titulo}>
        <div className="entre">
          <span className="small muted">Compra</span>
          <button type="button" className="btn-link" onClick={onFechar}>Fechar</button>
        </div>
        <input className="titulo-edit" defaultValue={c.titulo} onBlur={salvarSeMudou('titulo')} aria-label="Nome da compra" />

        <div className="form-grid">
          <div className="campo">
            <label>Etapa</label>
            <select value={c.etapa} onChange={(e) => onMudar({ etapa: e.target.value })}>
              {ETAPAS_COMPRA.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Evento</label>
            <select value={c.evento_id || ''} onChange={(e) => onMudar({ evento_id: e.target.value })}>
              <option value="">CAUP geral</option>
              {eventos.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div className="campo"><label>Quantidade</label><input defaultValue={c.quantidade || ''} onBlur={salvarSeMudou('quantidade')} placeholder="Ex.: 100, 200 ou 500" /></div>
          <div className="campo"><label>Valor (R$)</label><input defaultValue={c.valor ?? ''} onBlur={salvarSeMudou('valor')} inputMode="decimal" placeholder="0,00" /></div>
          <div className="campo"><label>Fornecedor</label><input defaultValue={c.fornecedor || ''} onBlur={salvarSeMudou('fornecedor')} /></div>
          <div className="campo">
            <label>Responsável</label>
            <select value={c.responsavel || ''} onChange={(e) => onMudar({ responsavel: e.target.value })}>
              <option value="">Ninguém</option>
              {equipe.map((p) => <option key={p.user_id} value={p.user_id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="campo"><label>Prazo</label><input type="date" defaultValue={c.prazo || ''} onChange={(e) => onMudar({ prazo: e.target.value })} style={{ colorScheme: 'dark' }} /></div>
          <div className="campo inteiro"><label>Descrição</label><textarea defaultValue={c.descricao || ''} onBlur={salvarSeMudou('descricao')} rows={3} placeholder="Detalhes, links dos orçamentos, quem pode acessar..." /></div>
        </div>

        <div className="pilha-p" style={{ gap: 10 }}>
          <span className="h2">Comentários</span>
          {comentarios === null ? <span className="small muted">Carregando…</span> : null}
          {(comentarios || []).map((m) => (
            <div key={m.id} className="mural-item">
              <span className="pilha-p" style={{ gap: 2 }}>
                <span className="small"><b>{m.autor_nome || 'Alguém'}</b> <span className="muted">· {new Date(m.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></span>
                <span style={{ whiteSpace: 'pre-line', color: 'var(--texto2)' }}>{m.texto}</span>
              </span>
            </div>
          ))}
          <form onSubmit={comentar} className="pilha-p" style={{ gap: 8 }}>
            <textarea className="input" value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} placeholder="Escreva um comentário (orçamentos, decisões...)" />
            <button type="submit" className="btn btn-p" disabled={enviando || !texto.trim()} style={{ alignSelf: 'flex-start' }}>{enviando ? 'Enviando…' : 'Comentar'}</button>
          </form>
        </div>

        <button type="button" className="btn-perigo" onClick={onExcluir} style={{ alignSelf: 'flex-start' }}>Excluir compra</button>
      </aside>
    </div>
  );
}
