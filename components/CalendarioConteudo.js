'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  criarCalendario, criarPost, editarCalendario, editarPost, excluirCalendario, excluirPost, importarCalendario,
} from '@/app/actions-calendario';
import { FORMATOS, campanhasDaSemana, ddmm, periodo, postNoDia, proximoPeriodo, semanaDoPost, semanas } from '@/lib/calendario';

const temporario = (id) => String(id).startsWith('novo-');

function useEsc(fn) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && ref.current();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);
}

function Painel({ titulo, onFechar, children }) {
  useEsc(onFechar);
  return (
    <div className="painel-fundo" onClick={onFechar} role="presentation">
      <aside className="painel-lateral" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={titulo}>
        <div className="entre">
          <span className="small muted">{titulo}</span>
          <button type="button" className="btn-link" onClick={onFechar}>Fechar</button>
        </div>
        {children}
      </aside>
    </div>
  );
}

// Título com a última palavra em itálico dourado ("Calendário de conteúdo")
function Titulo({ texto }) {
  const partes = String(texto || '').trim().split(' ');
  const ultima = partes.pop();
  return (
    <h1 className="cc-titulo">
      {partes.length ? partes.join(' ') + ' ' : ''}
      <em>{ultima}</em>
    </h1>
  );
}

function Seta({ volta }) {
  return volta ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label="e recomeça">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function CalendarioConteudo({ calendarios, calendario, posts: iniciais, equipe, hoje }) {
  const router = useRouter();
  const [posts, setPosts] = useState(iniciais);
  const [aberto, setAberto] = useState(null); // post aberto no painel
  const [painel, setPainel] = useState(null); // 'novo' | 'importar' | 'editar'
  const [erro, setErro] = useState('');
  const [, iniciar] = useTransition();

  useEffect(() => setPosts(iniciais), [iniciais]);

  const lista = useMemo(() => (calendario ? semanas(calendario.inicio, calendario.fim) : []), [calendario]);
  const porSemana = useMemo(() => {
    const g = lista.map(() => []);
    [...posts]
      .sort((a, b) => a.data.localeCompare(b.data) || (a.ordem ?? 0) - (b.ordem ?? 0))
      .forEach((p) => {
        const i = semanaDoPost(p.data, lista);
        if (i >= 0) g[i].push(p);
      });
    return g;
  }, [posts, lista]);
  const campanhas = useMemo(() => [...new Set(posts.map((p) => p.campanha).filter(Boolean))], [posts]);
  const feitos = posts.filter((p) => p.feito).length;

  function rodar(fn, desfazer) {
    setErro('');
    iniciar(async () => {
      try {
        await fn();
      } catch (e) {
        if (desfazer) desfazer();
        setErro(e?.message || 'Não foi possível salvar.');
        setTimeout(() => setErro(''), 6000);
      }
    });
  }

  function salvarPost(id, dados) {
    if (temporario(id)) {
      // Post novo: grava e troca o temporário pelo de verdade
      const temp = { id, ...dados };
      setPosts((l) => [...l.filter((p) => p.id !== id), temp]);
      setAberto(null);
      rodar(
        async () => {
          const criado = await criarPost({ calendario_id: calendario.id, dados });
          setPosts((l) => l.map((p) => (p.id === id ? criado : p)));
        },
        () => setPosts((l) => l.filter((p) => p.id !== id)),
      );
      return;
    }
    const antes = posts.find((p) => p.id === id);
    const otimista = { ...dados };
    if (dados.link && !('feito' in dados)) otimista.feito = true;
    setPosts((l) => l.map((p) => (p.id === id ? { ...p, ...otimista } : p)));
    setAberto((a) => (a?.id === id ? { ...a, ...otimista } : a));
    rodar(
      async () => {
        const salvo = await editarPost({ id, dados });
        setPosts((l) => l.map((p) => (p.id === id ? salvo : p)));
      },
      () => setPosts((l) => l.map((p) => (p.id === id ? antes : p))),
    );
  }

  function apagarPost(p) {
    if (!window.confirm(`Apagar o post de ${ddmm(p.data)}: "${p.descricao}"?`)) return;
    setAberto(null);
    if (temporario(p.id)) return;
    setPosts((l) => l.filter((x) => x.id !== p.id));
    rodar(() => excluirPost({ id: p.id }), () => setPosts((l) => [...l, p]));
  }

  function novoPost(semana) {
    const data = hoje >= semana.inicio && hoje <= semana.fim ? hoje : semana.inicio;
    setAberto({ id: 'novo-' + Date.now(), data, data_fim: null, campanha: '', descricao: '', formato: '', link: '', feito: false, responsavel: null });
  }

  const topo = (
    <div className="topo">
      <div className="pilha-p">
        <span className="selo">Marketing · Social mídia</span>
        {calendario ? (
          <span className="small" style={{ color: 'var(--texto3)' }}>
            {posts.length} {posts.length === 1 ? 'post' : 'posts'} · {feitos} {feitos === 1 ? 'feito' : 'feitos'}. Clique num post para colar o link e marcar como feito.
          </span>
        ) : null}
      </div>
      <div className="linha" style={{ gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-sec btn-p" onClick={() => setPainel('importar')}>Importar calendário</button>
        <button type="button" className="btn btn-p" onClick={() => setPainel('novo')}>+ Novo calendário</button>
      </div>
    </div>
  );

  return (
    <>
      {topo}

      {calendarios.length > 1 ? (
        <nav className="segmentos" aria-label="Calendários" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
          {[...calendarios].reverse().map((c) => (
            <a key={c.id} href={`/marketing/calendario?c=${c.id}`} className={c.id === calendario?.id ? 'ativo' : ''}>
              {periodo(c.inicio, c.fim)}
            </a>
          ))}
        </nav>
      ) : null}

      {!calendario ? (
        <div className="card vazio-card pilha-p" style={{ gap: 8, alignItems: 'flex-start' }}>
          <span className="h2">Nenhum calendário ainda</span>
          <span className="small muted">Crie um calendário em branco ou importe um pronto (texto ou imagem) que a Central monta no padrão.</span>
        </div>
      ) : (
        <section className="cc" aria-label={calendario.titulo}>
          <div className="cc-cabeca">
            <div className="pilha-p" style={{ gap: 6 }}>
              <span className="cc-kicker">{calendario.subtitulo}</span>
              <Titulo texto={calendario.titulo} />
            </div>
            <div className="linha" style={{ gap: 14, alignItems: 'center' }}>
              <span className="cc-logo" role="img" aria-label="CAUP Capital Upgrade" />
            </div>
          </div>

          {calendario.funil?.length ? (
            <ol className="cc-funil">
              {calendario.funil.map((f, i) => (
                <li key={i}>
                  <span className="cc-etapa">{f}</span>
                  {i < calendario.funil.length - 1 ? (
                    <span className="cc-seta"><Seta volta={i === calendario.funil.length - 2} /></span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}

          {calendario.regras?.length ? (
            <div className="cc-regras">
              {calendario.regras.map((r, i) => (
                <span key={i}><b>{r.rotulo}:</b> {r.texto}</span>
              ))}
            </div>
          ) : null}

          <div className="cc-semanas" style={{ '--n': Math.min(lista.length, 5) }}>
            {lista.map((s, i) => {
              const itens = porSemana[i] || [];
              const rotulo = calendario.semanas?.[s.inicio] || campanhasDaSemana(itens);
              return (
                <div key={s.inicio} className="cc-semana">
                  <div className="cc-semana-topo">
                    <span className="cc-semana-datas">{s.rotulo}</span>
                    <span className="cc-semana-tags">{rotulo || ' '}</span>
                  </div>
                  {itens.map((p) => {
                    const ehHoje = postNoDia(p, hoje);
                    const passou = (p.data_fim || p.data) < hoje;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={'cc-post' + (ehHoje ? ' hoje' : '') + (p.feito ? ' feito' : '')}
                        onClick={() => setAberto(p)}
                      >
                        <span className="cc-post-linha">
                          <b>{periodo(p.data, p.data_fim)}</b>
                          {p.campanha ? <span className="cc-campanha">{p.campanha}</span> : null}
                        </span>
                        <span className="cc-post-texto">{p.descricao}</span>
                        <span className="cc-post-linha" style={{ alignItems: 'center' }}>
                          {p.formato ? <span className="cc-formato">{p.formato}</span> : <span />}
                          {p.feito ? (
                            <span className="cc-status ok">
                              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              {p.link ? 'Publicado' : 'Feito'}
                            </span>
                          ) : ehHoje ? (
                            <span className="cc-status hoje">Hoje</span>
                          ) : passou ? (
                            <span className="cc-status atrasado">Sem link</span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                  <button type="button" className="cc-mais" onClick={() => novoPost(s)}>+ Adicionar post</button>
                </div>
              );
            })}
          </div>

          {calendario.eventos?.length ? (
            <div className="cc-eventos" style={{ '--n': Math.min(calendario.eventos.length, 5) }}>
              {calendario.eventos.map((e, i) => (
                <div key={i} className="cc-evento">
                  <span className="cc-evento-nome">{e.nome}</span>
                  <span className="cc-evento-datas">{e.datas}</span>
                </div>
              ))}
            </div>
          ) : null}

          {calendario.nota ? <p className="cc-nota">{calendario.nota}</p> : null}

          <div className="entre" style={{ gap: 10, flexWrap: 'wrap' }}>
            <span className="small muted">Período: {ddmm(calendario.inicio)} a {ddmm(calendario.fim)}</span>
            <button type="button" className="btn-link" onClick={() => setPainel('editar')}>Editar calendário</button>
          </div>
        </section>
      )}

      {aberto ? (
        <PainelPost
          p={aberto}
          campanhas={campanhas}
          equipe={equipe}
          onSalvar={(dados) => salvarPost(aberto.id, dados)}
          onExcluir={() => apagarPost(aberto)}
          onFechar={() => setAberto(null)}
        />
      ) : null}

      {painel === 'novo' ? (
        <PainelNovo calendario={calendario} onFechar={() => setPainel(null)} onCriado={(id) => { setPainel(null); router.push('/marketing/calendario?c=' + id); }} />
      ) : null}
      {painel === 'importar' ? (
        <PainelImportar onFechar={() => setPainel(null)} onCriado={(id) => { setPainel(null); router.push('/marketing/calendario?c=' + id); }} />
      ) : null}
      {painel === 'editar' && calendario ? (
        <PainelEditar
          calendario={calendario}
          lista={lista}
          porSemana={porSemana}
          onFechar={() => setPainel(null)}
          onExcluido={() => { setPainel(null); router.push('/marketing/calendario'); }}
        />
      ) : null}

      {erro ? <div className="aviso t-coral toast" role="alert">{erro}</div> : null}
    </>
  );
}

// ---------------------------------------------------------------- Post

function PainelPost({ p, campanhas, equipe, onSalvar, onExcluir, onFechar }) {
  const novo = temporario(p.id);
  const [f, setF] = useState({
    data: p.data || '',
    data_fim: p.data_fim || '',
    campanha: p.campanha || '',
    descricao: p.descricao || '',
    formato: p.formato || '',
    link: p.link || '',
    feito: Boolean(p.feito),
    responsavel: p.responsavel || '',
  });
  const campo = (k) => ({ value: f[k], onChange: (e) => setF((x) => ({ ...x, [k]: e.target.value })) });

  // Post já existente: o link salva ao sair do campo (é o mais usado)
  function salvarLink() {
    if (novo || (f.link || '') === (p.link || '')) return;
    onSalvar({ link: f.link });
    if (f.link.trim()) setF((x) => ({ ...x, feito: true }));
  }

  function salvar(e) {
    e.preventDefault();
    const dados = { ...f, data_fim: f.data_fim || null, responsavel: f.responsavel || null };
    if (!novo && !f.link.trim()) dados.feito = f.feito;
    onSalvar(dados);
    onFechar();
  }

  return (
    <Painel titulo={novo ? 'Novo post' : 'Post do calendário'} onFechar={onFechar}>
      <form onSubmit={salvar} className="pilha-p" style={{ gap: 16 }}>
        {!novo ? (
          <div className="cc-link-box">
            <label htmlFor="cp-link" className="small" style={{ fontWeight: 600 }}>Link do post ou do anúncio</label>
            <div className="linha" style={{ gap: 8 }}>
              <input id="cp-link" className="input" type="url" inputMode="url" placeholder="Cole aqui o link do Instagram, do anúncio..." {...campo('link')} onBlur={salvarLink} style={{ flex: 1, minWidth: 0 }} />
              {p.link ? <a className="btn btn-sec btn-p" href={p.link} target="_blank" rel="noreferrer">Abrir</a> : null}
            </div>
            <span className="small muted">Com o link colado, o post fica como feito no calendário.</span>
          </div>
        ) : null}

        <div className="form-grid">
          <div className="campo"><label htmlFor="cp-data">Data</label><input id="cp-data" type="date" required style={{ colorScheme: 'dark' }} {...campo('data')} /></div>
          <div className="campo"><label htmlFor="cp-fim">Até (se for mais de um dia)</label><input id="cp-fim" type="date" min={f.data || undefined} style={{ colorScheme: 'dark' }} {...campo('data_fim')} /></div>
          <div className="campo">
            <label htmlFor="cp-camp">Campanha</label>
            <input id="cp-camp" list="cp-campanhas" placeholder="GC, Podcast, Black..." maxLength={60} {...campo('campanha')} />
            <datalist id="cp-campanhas">{campanhas.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="campo">
            <label htmlFor="cp-formato">Formato</label>
            <input id="cp-formato" list="cp-formatos" placeholder="Reel, Carrossel, Stories..." maxLength={60} {...campo('formato')} />
            <datalist id="cp-formatos">{FORMATOS.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="campo inteiro"><label htmlFor="cp-desc">Conteúdo</label><textarea id="cp-desc" rows={3} required maxLength={400} placeholder='Ex.: 5 sinais de que sua gestão comercial travou' {...campo('descricao')} /></div>
          <div className="campo">
            <label htmlFor="cp-resp">Responsável</label>
            <select id="cp-resp" {...campo('responsavel')}>
              <option value="">Ninguém</option>
              {equipe.map((x) => <option key={x.user_id} value={x.user_id}>{x.nome}</option>)}
            </select>
          </div>
          {!novo ? (
            <label className="linha small" style={{ gap: 8, alignSelf: 'end', paddingBottom: 12, cursor: 'pointer', color: 'var(--texto2)' }}>
              <input type="checkbox" checked={f.feito} disabled={Boolean(f.link.trim())} onChange={(e) => setF((x) => ({ ...x, feito: e.target.checked }))} />
              Já foi feito
            </label>
          ) : null}
        </div>

        <div className="entre" style={{ gap: 12, flexWrap: 'wrap' }}>
          <button type="submit" className="btn" disabled={!f.data || !f.descricao.trim()}>{novo ? 'Adicionar ao calendário' : 'Salvar'}</button>
          {!novo ? <button type="button" className="btn-perigo" onClick={onExcluir}>Apagar post</button> : null}
        </div>
      </form>
    </Painel>
  );
}

// ---------------------------------------------------------------- Novo calendário

function PainelNovo({ calendario, onFechar, onCriado }) {
  const prox = calendario ? proximoPeriodo(calendario) : null;
  const [inicio, setInicio] = useState(prox?.inicio || '');
  const [fim, setFim] = useState(prox?.fim || '');
  const [copiar, setCopiar] = useState(Boolean(calendario));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function criar(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      onCriado(await criarCalendario({ inicio, fim, copiarDe: copiar ? calendario?.id : null }));
    } catch (e2) {
      setErro(e2?.message || 'Não foi possível criar.');
      setSalvando(false);
    }
  }

  return (
    <Painel titulo="Novo calendário" onFechar={onFechar}>
      <form onSubmit={criar} className="pilha-p" style={{ gap: 16 }}>
        <span className="small muted">
          {calendario
            ? `Já vem com as datas logo depois do calendário atual (${ddmm(calendario.inicio)} a ${ddmm(calendario.fim)}). É só ajustar se quiser.`
            : 'Escolha o período. Depois é só adicionar os posts em cada semana.'}
        </span>
        <div className="form-grid">
          <div className="campo"><label htmlFor="nc-ini">Primeiro dia</label><input id="nc-ini" type="date" required value={inicio} onChange={(e) => setInicio(e.target.value)} style={{ colorScheme: 'dark' }} /></div>
          <div className="campo"><label htmlFor="nc-fim">Último dia</label><input id="nc-fim" type="date" required min={inicio || undefined} value={fim} onChange={(e) => setFim(e.target.value)} style={{ colorScheme: 'dark' }} /></div>
        </div>
        {calendario ? (
          <label className="linha small" style={{ gap: 8, cursor: 'pointer', color: 'var(--texto2)' }}>
            <input type="checkbox" checked={copiar} onChange={(e) => setCopiar(e.target.checked)} />
            Usar o mesmo padrão (funil, regras de postagem e títulos)
          </label>
        ) : null}
        {erro ? <div className="aviso t-coral">{erro}</div> : null}
        <button type="submit" className="btn" disabled={salvando || !inicio || !fim} style={{ alignSelf: 'flex-start' }}>{salvando ? 'Criando…' : 'Criar calendário'}</button>
      </form>
    </Painel>
  );
}

// ---------------------------------------------------------------- Importar (texto ou imagem)

// Diminui a imagem no navegador antes de mandar (fica leve e rápido)
function lerImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const max = 2000;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => reject(new Error('Não consegui abrir essa imagem.'));
    img.src = url;
  });
}

function PainelImportar({ onFechar, onCriado }) {
  const [texto, setTexto] = useState('');
  const [imagem, setImagem] = useState(null);
  const [nome, setNome] = useState('');
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState('');

  async function escolher(e) {
    const a = e.target.files?.[0];
    if (!a) return;
    setErro('');
    try {
      setImagem(await lerImagem(a));
      setNome(a.name);
    } catch (e2) {
      setErro(e2.message);
    }
  }

  async function importar(e) {
    e.preventDefault();
    setErro('');
    setLendo(true);
    const r = await importarCalendario({ texto, imagem, tipo: 'image/jpeg' }).catch((e2) => ({ erro: e2?.message }));
    if (r?.erro || !r?.id) {
      setErro(r?.erro || 'Não foi possível importar.');
      setLendo(false);
      return;
    }
    onCriado(r.id);
  }

  return (
    <Painel titulo="Importar calendário" onFechar={onFechar}>
      <form onSubmit={importar} className="pilha-p" style={{ gap: 16 }}>
        <span className="small muted">
          Mande a imagem do calendário ou cole o texto (do chat, de uma planilha, de um documento). A IA lê e monta tudo neste padrão: semanas, posts, campanhas, formatos, funil e rodapé.
        </span>
        <label className="cc-upload">
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={escolher} />
          {imagem ? (
            <>
              <img src={imagem} alt="" />
              <span className="small">{nome} · trocar imagem</span>
            </>
          ) : (
            <span className="small">Escolher imagem do calendário</span>
          )}
        </label>
        <div className="campo">
          <label htmlFor="ic-texto">Ou cole o texto</label>
          <textarea id="ic-texto" rows={8} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={'17/11 · Podcast · Reel\nAnúncio: "Vendedor bonzinho não fica rico"\n\n18/11 · GC · Carrossel\n5 sinais de que sua gestão comercial travou'} />
        </div>
        {erro ? <div className="aviso t-coral">{erro}</div> : null}
        <button type="submit" className="btn" disabled={lendo || (!texto.trim() && !imagem)} style={{ alignSelf: 'flex-start' }}>
          {lendo ? 'Lendo o calendário…' : 'Montar calendário'}
        </button>
        {lendo ? <span className="small muted">Leva uns segundos. O calendário abre sozinho quando ficar pronto.</span> : null}
      </form>
    </Painel>
  );
}

// ---------------------------------------------------------------- Editar calendário (cabeçalho, funil, regras, rodapé)

const linhas = (s) => String(s || '').split('\n').map((l) => l.trim()).filter(Boolean);
const pares = (s, a, b) =>
  linhas(s).map((l) => {
    const i = l.indexOf(':');
    return i > 0 ? { [a]: l.slice(0, i).trim(), [b]: l.slice(i + 1).trim() } : { [a]: l, [b]: '' };
  });

function PainelEditar({ calendario, lista, porSemana, onFechar, onExcluido }) {
  const [f, setF] = useState({
    titulo: calendario.titulo,
    subtitulo: calendario.subtitulo,
    inicio: calendario.inicio,
    fim: calendario.fim,
    funil: (calendario.funil || []).join('\n'),
    regras: (calendario.regras || []).map((r) => `${r.rotulo}: ${r.texto}`).join('\n'),
    eventos: (calendario.eventos || []).map((e) => `${e.nome}: ${e.datas}`).join('\n'),
    nota: calendario.nota || '',
    semanas: { ...(calendario.semanas || {}) },
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const campo = (k) => ({ value: f[k], onChange: (e) => setF((x) => ({ ...x, [k]: e.target.value })) });

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      await editarCalendario({
        id: calendario.id,
        dados: {
          titulo: f.titulo,
          subtitulo: f.subtitulo,
          inicio: f.inicio,
          fim: f.fim,
          funil: linhas(f.funil),
          regras: pares(f.regras, 'rotulo', 'texto').filter((r) => r.texto),
          eventos: pares(f.eventos, 'nome', 'datas'),
          nota: f.nota,
          semanas: f.semanas,
        },
      });
      onFechar();
    } catch (e2) {
      setErro(e2?.message || 'Não foi possível salvar.');
      setSalvando(false);
    }
  }

  async function apagar() {
    if (!window.confirm(`Apagar o calendário de ${ddmm(calendario.inicio)} a ${ddmm(calendario.fim)} com todos os posts? Não dá para desfazer.`)) return;
    try {
      await excluirCalendario({ id: calendario.id });
      onExcluido();
    } catch (e2) {
      setErro(e2?.message || 'Não foi possível apagar.');
    }
  }

  return (
    <Painel titulo="Editar calendário" onFechar={onFechar}>
      <form onSubmit={salvar} className="pilha-p" style={{ gap: 16 }}>
        <div className="form-grid">
          <div className="campo"><label htmlFor="ec-tit">Título</label><input id="ec-tit" maxLength={80} {...campo('titulo')} /></div>
          <div className="campo"><label htmlFor="ec-sub">Linha de cima</label><input id="ec-sub" maxLength={80} placeholder="Marketing · Orgânico" {...campo('subtitulo')} /></div>
          <div className="campo"><label htmlFor="ec-ini">Primeiro dia</label><input id="ec-ini" type="date" style={{ colorScheme: 'dark' }} {...campo('inicio')} /></div>
          <div className="campo"><label htmlFor="ec-fim">Último dia</label><input id="ec-fim" type="date" min={f.inicio} style={{ colorScheme: 'dark' }} {...campo('fim')} /></div>
          <div className="campo inteiro"><label htmlFor="ec-funil">Funil (uma etapa por linha)</label><textarea id="ec-funil" rows={6} {...campo('funil')} /></div>
          <div className="campo inteiro"><label htmlFor="ec-regras">Regras de postagem (uma por linha, “Rótulo: texto”)</label><textarea id="ec-regras" rows={3} {...campo('regras')} /></div>
        </div>

        <div className="pilha-p" style={{ gap: 10 }}>
          <span className="small" style={{ fontWeight: 600, color: 'var(--texto2)' }}>Campanhas de cada semana</span>
          {lista.map((s, i) => (
            <div key={s.inicio} className="linha" style={{ gap: 10 }}>
              <span className="small muted" style={{ width: 84, flex: '0 0 84px' }}>{s.rotulo}</span>
              <input
                className="input"
                style={{ flex: 1, minWidth: 0, padding: '9px 12px' }}
                maxLength={80}
                placeholder={campanhasDaSemana(porSemana[i] || []) || 'Ex.: GC · Podcast · Black'}
                value={f.semanas[s.inicio] || ''}
                onChange={(e) => setF((x) => ({ ...x, semanas: { ...x.semanas, [s.inicio]: e.target.value } }))}
                aria-label={'Campanhas da semana ' + s.rotulo}
              />
            </div>
          ))}
          <span className="small muted">Em branco, a Central mostra as campanhas que mais aparecem na semana.</span>
        </div>

        <div className="form-grid">
          <div className="campo inteiro"><label htmlFor="ec-ev">Eventos do rodapé (um por linha, “Nome: datas”)</label><textarea id="ec-ev" rows={5} placeholder={'GC: 07–08/12\nPodcast: 09/12'} {...campo('eventos')} /></div>
          <div className="campo inteiro"><label htmlFor="ec-nota">Observação do rodapé</label><textarea id="ec-nota" rows={3} maxLength={600} {...campo('nota')} /></div>
        </div>

        {erro ? <div className="aviso t-coral">{erro}</div> : null}
        <div className="entre" style={{ gap: 12, flexWrap: 'wrap' }}>
          <button type="submit" className="btn" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          <button type="button" className="btn-perigo" onClick={apagar}>Apagar calendário</button>
        </div>
      </form>
    </Painel>
  );
}
