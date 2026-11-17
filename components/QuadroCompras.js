'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  atualizarCompra, comentarCompra, criarCompra, criarEtapa, criarPipeline, editarEtapa, editarPipeline,
  excluirCompra, excluirEtapa, excluirPipeline, listarComentarios, moverEtapa,
} from '@/app/actions-compras';
import { CORES_COLUNA, fmtReal } from '@/lib/compras';
import ListaIncremental from './ListaIncremental';

const temporaria = (id) => String(id).startsWith('nova-');

// Fecha o painel com Esc
function useEsc(fn) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && ref.current();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);
}

function Painel({ titulo, rotulo, onFechar, children }) {
  useEsc(onFechar);
  return (
    <div className="painel-fundo" onClick={onFechar} role="presentation">
      <aside className="painel-lateral" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={rotulo}>
        <div className="entre">
          <span className="small muted">{titulo}</span>
          <button type="button" className="btn-link" onClick={onFechar}>Fechar</button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function Cores({ valor, onEscolher }) {
  return (
    <span className="cores" role="radiogroup" aria-label="Cor da coluna">
      {CORES_COLUNA.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={valor === c.id}
          aria-label={c.nome}
          title={c.nome}
          className={'cor-bola c-' + c.id + (valor === c.id ? ' ativa' : '')}
          onClick={() => onEscolher(c.id)}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------- Botão + painel "Novo pipeline"

export function NovoPipeline({ eventos }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [evento, setEvento] = useState('');
  const [padrao, setPadrao] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function criar(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      const id = await criarPipeline({ nome, evento_id: evento || null, colunasPadrao: padrao });
      setAberto(false);
      setNome('');
      setEvento('');
      router.push('/financeiro/compras?p=' + id);
    } catch (e2) {
      setErro(e2?.message || 'Não foi possível criar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-p" onClick={() => setAberto(true)}>+ Novo pipeline</button>
      {aberto ? (
        <Painel titulo="Novo pipeline de compras" rotulo="Novo pipeline de compras" onFechar={() => setAberto(false)}>
          <form onSubmit={criar} className="pilha-p" style={{ gap: 16 }}>
            <div className="campo">
              <label htmlFor="np-nome">Nome</label>
              <input
                id="np-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Ambição, GI Alphaville, Escritório"
                autoFocus
                maxLength={80}
              />
            </div>
            <div className="campo">
              <label htmlFor="np-evento">Ligar a um evento (opcional)</label>
              <select
                id="np-evento"
                value={evento}
                onChange={(e) => {
                  setEvento(e.target.value);
                  const ev = eventos.find((x) => x.id === e.target.value);
                  if (ev && !nome.trim()) setNome(ev.nome);
                }}
              >
                <option value="">Nenhum</option>
                {eventos.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <label className="linha small" style={{ gap: 8, cursor: 'pointer', color: 'var(--texto2)' }}>
              <input type="checkbox" checked={padrao} onChange={(e) => setPadrao(e.target.checked)} />
              Começar com as colunas padrão (orçamentos, reunião, autorizado, comprando, finalizado)
            </label>
            <span className="small muted">Depois dá para renomear, mudar a cor, reordenar e apagar as colunas em “Editar quadro”.</span>
            {erro ? <div className="aviso t-coral">{erro}</div> : null}
            <button type="submit" className="btn" disabled={salvando || !nome.trim()} style={{ alignSelf: 'flex-start' }}>
              {salvando ? 'Criando…' : 'Criar pipeline'}
            </button>
          </form>
        </Painel>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------- Quadro

export default function QuadroCompras({ pipeline, pipelines, etapas: etapasIniciais, compras: iniciais, eventos, equipe }) {
  const router = useRouter();
  const [compras, setCompras] = useState(iniciais);
  const [etapas, setEtapas] = useState(etapasIniciais);
  const [aberta, setAberta] = useState(null);
  const [editando, setEditando] = useState(false);
  const [arrastando, setArrastando] = useState(null);
  const [alvo, setAlvo] = useState(null);
  const [nova, setNova] = useState('');
  const [erro, setErro] = useState('');
  const [, iniciar] = useTransition();

  useEffect(() => setCompras(iniciais), [iniciais]);
  useEffect(() => setEtapas(etapasIniciais), [etapasIniciais]);

  const primeira = etapas[0]?.id || null;
  const colunaDe = (c) => (etapas.some((e) => e.id === c.etapa_id) ? c.etapa_id : primeira);
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
    // Trocar de pipeline tira a compra deste quadro
    if (dados.pipeline_id && dados.pipeline_id !== pipeline.id) {
      setCompras((l) => l.filter((c) => c.id !== id));
      setAberta(null);
      rodar(() => atualizarCompra({ id, dados }), () => setCompras((l) => [antes, ...l]));
      return;
    }
    setCompras((l) => l.map((c) => (c.id === id ? { ...c, ...dados } : c)));
    if (aberta?.id === id) setAberta((a) => ({ ...a, ...dados }));
    rodar(() => atualizarCompra({ id, dados }), () => setCompras((l) => l.map((c) => (c.id === id ? antes : c))));
  }

  function adicionar(e) {
    e.preventDefault();
    const titulo = nova.trim();
    if (!titulo) return;
    setNova('');
    const temp = { id: 'nova-' + Date.now(), titulo, etapa_id: primeira, pipeline_id: pipeline.id, comentarios: 0 };
    setCompras((l) => [temp, ...l]);
    rodar(
      async () => {
        const criada = await criarCompra({ titulo, pipeline_id: pipeline.id, etapa_id: primeira });
        setCompras((l) => l.map((c) => (c.id === temp.id ? criada : c)));
      },
      () => setCompras((l) => l.filter((c) => c.id !== temp.id)),
    );
  }

  function soltar(etapaId) {
    if (arrastando) {
      const c = compras.find((x) => x.id === arrastando);
      if (c && colunaDe(c) !== etapaId) mudar(c.id, { etapa_id: etapaId });
    }
    setArrastando(null);
    setAlvo(null);
  }

  const muitas = etapas.length > 5;

  return (
    <>
      <div className="entre" style={{ flexWrap: 'wrap', gap: 10 }}>
        <span className="small" style={{ color: 'var(--texto3)' }}>
          Compras <span className="muted">›</span> <b style={{ color: 'var(--texto)' }}>{pipeline.nome}</b>
          {pipeline.evento_id ? <span className="muted"> · ligado ao evento {eventos.find((e) => e.id === pipeline.evento_id)?.nome}</span> : null}
        </span>
        <button type="button" className="btn btn-sec btn-p" onClick={() => setEditando(true)}>Editar quadro</button>
      </div>

      {etapas.length === 0 ? (
        <div className="vazio">Este quadro não tem colunas. Abra “Editar quadro” e crie a primeira.</div>
      ) : (
        <div className={'kanban-compras' + (muitas ? ' muitas' : '')} style={{ '--n': etapas.length }}>
          {etapas.map((et, i) => {
            const lista = compras.filter((c) => colunaDe(c) === et.id);
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
                {i === 0 ? (
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
                      draggable={!temporaria(c.id)}
                      onDragStart={() => setArrastando(c.id)}
                      onDragEnd={() => { setArrastando(null); setAlvo(null); }}
                      onClick={() => !temporaria(c.id) && setAberta(c)}
                    >
                      <span style={{ fontWeight: 600, textAlign: 'left' }}>{c.titulo}</span>
                      {c.descricao ? <span className="small muted compra-desc">{c.descricao}</span> : null}
                      {c.quantidade || c.valor ? (
                        <span className="linha" style={{ gap: 8 }}>
                          {c.quantidade ? <span className="small" style={{ color: 'var(--texto3)' }}>Qtd: {c.quantidade}</span> : null}
                          {c.valor ? <span className="small" style={{ color: 'var(--texto2)', fontWeight: 600 }}>{fmtReal(c.valor)}</span> : null}
                        </span>
                      ) : null}
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
      )}

      {aberta ? (
        <PainelCompra
          c={aberta}
          etapaAtual={colunaDe(aberta)}
          etapas={etapas}
          pipeline={pipeline}
          pipelines={pipelines}
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

      {editando ? (
        <EditarQuadro
          pipeline={pipeline}
          totalPipelines={pipelines.length}
          etapas={etapas}
          setEtapas={setEtapas}
          compras={compras}
          eventos={eventos}
          rodar={rodar}
          onFechar={() => setEditando(false)}
          onPipelineExcluido={() => {
            setEditando(false);
            router.push('/financeiro/compras');
          }}
        />
      ) : null}

      {erro ? <div className="aviso t-coral toast" role="alert">{erro}</div> : null}
    </>
  );
}

// ---------------------------------------------------------------- Editar quadro (pipeline + colunas)

function EditarQuadro({ pipeline, totalPipelines, etapas, setEtapas, compras, eventos, rodar, onFechar, onPipelineExcluido }) {
  const [novaColuna, setNovaColuna] = useState('');
  const [corNova, setCorNova] = useState('gray');
  const [excluindo, setExcluindo] = useState(false);
  const qtdNa = (id) => compras.filter((c) => c.etapa_id === id || (!etapas.some((e) => e.id === c.etapa_id) && id === etapas[0]?.id)).length;

  function alterar(id, dados) {
    const antes = etapas;
    setEtapas((l) => l.map((e) => (e.id === id ? { ...e, ...dados } : e)));
    rodar(() => editarEtapa({ id, ...dados }), () => setEtapas(antes));
  }

  function mover(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= etapas.length) return;
    const antes = etapas;
    const l = [...etapas];
    [l[i], l[j]] = [l[j], l[i]];
    setEtapas(l);
    rodar(() => moverEtapa({ id: etapas[i].id, direcao: dir }), () => setEtapas(antes));
  }

  function apagar(et) {
    if (etapas.length <= 1) return;
    const n = qtdNa(et.id);
    const destino = etapas.find((e) => e.id !== et.id)?.nome;
    const msg = n
      ? `Apagar a coluna "${et.nome}"? As ${n} compra(s) dela vão para "${destino}".`
      : `Apagar a coluna "${et.nome}"?`;
    if (!window.confirm(msg)) return;
    const antes = etapas;
    setEtapas((l) => l.filter((e) => e.id !== et.id));
    rodar(() => excluirEtapa({ id: et.id }), () => setEtapas(antes));
  }

  function adicionar(e) {
    e.preventDefault();
    const nome = novaColuna.trim();
    if (!nome) return;
    const temp = { id: 'nova-' + Date.now(), nome, cor: corNova, pipeline_id: pipeline.id };
    setEtapas((l) => [...l, temp]);
    setNovaColuna('');
    rodar(
      async () => {
        const criada = await criarEtapa({ pipeline_id: pipeline.id, nome, cor: temp.cor });
        setEtapas((l) => l.map((x) => (x.id === temp.id ? criada : x)));
      },
      () => setEtapas((l) => l.filter((x) => x.id !== temp.id)),
    );
  }

  function apagarPipeline() {
    const n = compras.length;
    const msg = n
      ? `Apagar o pipeline "${pipeline.nome}"? As ${n} compra(s) dele também serão apagadas. Não dá para desfazer.`
      : `Apagar o pipeline "${pipeline.nome}"?`;
    if (!window.confirm(msg)) return;
    setExcluindo(true);
    rodar(
      async () => {
        await excluirPipeline({ id: pipeline.id });
        onPipelineExcluido();
      },
      () => setExcluindo(false),
    );
  }

  return (
    <Painel titulo="Editar quadro" rotulo={'Editar quadro ' + pipeline.nome} onFechar={onFechar}>
      <div className="form-grid">
        <div className="campo">
          <label htmlFor="ep-nome">Nome do pipeline</label>
          <input
            id="ep-nome"
            defaultValue={pipeline.nome}
            maxLength={80}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== pipeline.nome) rodar(() => editarPipeline({ id: pipeline.id, nome: v }));
            }}
          />
        </div>
        <div className="campo">
          <label htmlFor="ep-evento">Evento ligado</label>
          <select id="ep-evento" defaultValue={pipeline.evento_id || ''} onChange={(e) => rodar(() => editarPipeline({ id: pipeline.id, evento_id: e.target.value || null }))}>
            <option value="">Nenhum</option>
            {eventos.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="pilha-p" style={{ gap: 10 }}>
        <span className="h2">Colunas do kanban</span>
        <span className="small muted">A última coluna conta como “já comprado” nos números do topo.</span>
        {etapas.map((et, i) => (
          <div key={et.id} className="coluna-edit">
            <div className="coluna-edit-linha">
              <input
                className="input"
                defaultValue={et.nome}
                maxLength={60}
                aria-label={'Nome da coluna ' + et.nome}
                disabled={temporaria(et.id)}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (!v) e.target.value = et.nome;
                  else if (v !== et.nome) alterar(et.id, { nome: v });
                }}
              />
              <span className="coluna-edit-acoes">
                <button type="button" className="icone-btn" onClick={() => mover(i, -1)} disabled={i === 0 || temporaria(et.id)} aria-label="Mover para a esquerda" title="Mover para a esquerda">
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8 10 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button type="button" className="icone-btn" onClick={() => mover(i, 1)} disabled={i === etapas.length - 1 || temporaria(et.id)} aria-label="Mover para a direita" title="Mover para a direita">
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </span>
            </div>
            <div className="entre" style={{ gap: 10, flexWrap: 'wrap' }}>
              <Cores valor={et.cor} onEscolher={(cor) => !temporaria(et.id) && cor !== et.cor && alterar(et.id, { cor })} />
              <span className="linha" style={{ gap: 12 }}>
                <span className="small muted">{qtdNa(et.id)} compra(s)</span>
                <button type="button" className="btn-perigo" onClick={() => apagar(et)} disabled={etapas.length <= 1 || temporaria(et.id)}>Apagar</button>
              </span>
            </div>
          </div>
        ))}

        <form onSubmit={adicionar} className="coluna-edit nova">
          <input className="input" value={novaColuna} onChange={(e) => setNovaColuna(e.target.value)} placeholder="Nome da nova coluna" maxLength={60} aria-label="Nome da nova coluna" />
          <div className="entre" style={{ gap: 10, flexWrap: 'wrap' }}>
            <Cores valor={corNova} onEscolher={setCorNova} />
            <button type="submit" className="btn btn-p" disabled={!novaColuna.trim()}>Adicionar coluna</button>
          </div>
        </form>
      </div>

      <div className="pilha-p" style={{ gap: 6, paddingTop: 14, borderTop: '1px solid var(--borda)' }}>
        <button type="button" className="btn-perigo" onClick={apagarPipeline} disabled={excluindo || totalPipelines <= 1} style={{ alignSelf: 'flex-start' }}>
          {excluindo ? 'Apagando…' : 'Apagar este pipeline'}
        </button>
        <span className="small muted">
          {totalPipelines <= 1 ? 'Este é o único pipeline, então não dá para apagar.' : 'Apaga o pipeline, as colunas e as compras dele.'}
        </span>
      </div>
    </Painel>
  );
}

// ---------------------------------------------------------------- Detalhe da compra

function PainelCompra({ c, etapaAtual, etapas, pipeline, pipelines, equipe, onMudar, onFechar, onExcluir, onComentou }) {
  const [comentarios, setComentarios] = useState(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    listarComentarios({ compra_id: c.id }).then((l) => vivo && setComentarios(l)).catch(() => vivo && setComentarios([]));
    return () => {
      vivo = false;
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
    <Painel titulo={'Compra · ' + pipeline.nome} rotulo={'Compra: ' + c.titulo} onFechar={onFechar}>
      <input className="titulo-edit" defaultValue={c.titulo} onBlur={salvarSeMudou('titulo')} aria-label="Nome da compra" />

      <div className="form-grid">
        <div className="campo">
          <label>Coluna</label>
          <select value={etapaAtual || ''} onChange={(e) => onMudar({ etapa_id: e.target.value })}>
            {etapas.filter((e) => !temporaria(e.id)).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
        <div className="campo">
          <label>Pipeline</label>
          <select
            value={pipeline.id}
            onChange={(e) => {
              const destino = pipelines.find((p) => p.id === e.target.value);
              if (destino && window.confirm(`Mover "${c.titulo}" para o pipeline ${destino.nome}? Ela entra na primeira coluna de lá.`)) {
                onMudar({ pipeline_id: destino.id });
              }
            }}
          >
            {pipelines.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
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
    </Painel>
  );
}
