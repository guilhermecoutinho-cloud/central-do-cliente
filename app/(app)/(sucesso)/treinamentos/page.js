import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { alternarConexao, alternarFerramenta, criarConexao, criarFerramenta, removerConexao, removerFerramenta } from '@/app/actions-aluno';
import { TIPOS_CONEXAO, calcNps, tipoConexao, zonaNps } from '@/lib/aluno';
import { PRODUTOS } from '@/lib/util';
import EditarTreinamento from '@/components/EditarTreinamento';

const ABAS = [
  ['alunos', 'Alunos'],
  ['treinamentos', 'Treinamentos'],
  ['ferramentas', 'Ferramentas'],
  ['conexoes', 'Conexões'],
  ['nps', 'NPS'],
];

const fmtDia = (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

function FaltaSql({ arquivo }) {
  return <div className="aviso t-amber">Falta ativar esta parte: rode o arquivo supabase/{arquivo} no SQL Editor do Supabase.</div>;
}

// Busca do aluno: digita o nome (ou empresa, ou alguém do time dele) e abre a ficha completa
async function AbaAlunos({ supabase, q }) {
  const busca = String(q || '').trim().slice(0, 80);
  const campos = 'id, nome, empresa, produto, status, cidade, estado';
  let lista = [];
  let total = 0;
  if (busca) {
    const termo = `%${busca.replace(/[%_,()]/g, ' ')}%`;
    const [{ data: porNome }, { data: porMembro }] = await Promise.all([
      supabase.from('clientes').select(campos).or(`nome.ilike.${termo},empresa.ilike.${termo},email.ilike.${termo},cpf.ilike.${termo}`).order('nome').limit(60),
      supabase.from('membros').select('cliente_id, nome').ilike('nome', termo).limit(40),
    ]);
    const ids = new Set((porNome || []).map((c) => c.id));
    const faltam = [...new Set((porMembro || []).map((m) => m.cliente_id))].filter((id) => !ids.has(id));
    const { data: extras } = faltam.length ? await supabase.from('clientes').select(campos).in('id', faltam) : { data: [] };
    const membroDe = Object.fromEntries((porMembro || []).map((m) => [m.cliente_id, m.nome]));
    lista = [...(porNome || []), ...(extras || []).map((c) => ({ ...c, via: membroDe[c.id] }))];
  } else {
    const { data, count } = await supabase.from('clientes').select(campos, { count: 'exact' }).neq('status', 'encerrado').order('nome').limit(80);
    lista = data || [];
    total = count || 0;
  }
  // Foto, se a ficha já estiver ativa
  const { data: fotos } = lista.length ? await supabase.from('clientes').select('id, foto_url').in('id', lista.map((c) => c.id)) : { data: [] };
  const fotoDe = Object.fromEntries((fotos || []).map((f) => [f.id, f.foto_url]));

  return (
    <div className="pilha" style={{ gap: 14 }}>
      <form className="busca-aluno" role="search">
        <input type="hidden" name="aba" value="alunos" />
        <input name="q" defaultValue={busca} placeholder="Pesquise o nome do aluno, da empresa, o e-mail ou o CPF" aria-label="Pesquisar aluno" autoFocus />
        <button type="submit" className="btn">Buscar</button>
      </form>
      <span className="small muted">
        {busca
          ? `${lista.length} ${lista.length === 1 ? 'resultado' : 'resultados'} para “${busca}”.`
          : `${total} alunos ativos e em onboarding${total > lista.length ? ` (mostrando os ${lista.length} primeiros; pesquise para achar os outros)` : ''}. Clique para abrir a ficha completa.`}
      </span>
      {lista.length ? (
        <div className="alunos-grade">
          {lista.map((c) => (
            <Link key={c.id} href={`/alunos/${c.id}`} className="aluno-cartao">
              {fotoDe[c.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fotoDe[c.id]} alt="" className="aluno-mini" />
              ) : null}
              <span className="pilha-p" style={{ gap: 2, minWidth: 0 }}>
                <span className="aluno-nome">{c.nome}</span>
                <span className="small muted">{c.empresa}</span>
                <span className="small" style={{ color: 'var(--texto3)' }}>
                  {[c.produto, [c.cidade, c.estado].filter(Boolean).join('/'), c.status === 'encerrado' ? 'encerrado' : null].filter(Boolean).join(' · ')}
                  {c.via ? ` · time: ${c.via}` : ''}
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : busca ? (
        <div className="vazio">Nenhum aluno encontrado.</div>
      ) : null}
    </div>
  );
}

async function AbaTreinamentos({ supabase }) {
  const [{ data: treinamentos, error }, { data: checks }] = await Promise.all([
    supabase.from('treinamentos').select('*').order('ordem'),
    supabase.from('aluno_treinamentos').select('treinamento_id'),
  ]);
  if (error) return <FaltaSql arquivo="area-aluno.sql" />;
  const porTreino = {};
  (checks || []).forEach((c) => (porTreino[c.treinamento_id] = (porTreino[c.treinamento_id] || 0) + 1));
  return (
    <div className="pilha" style={{ gap: 14 }}>
      <span className="small" style={{ color: 'var(--texto3)' }}>
        As capas aparecem na ficha de cada cliente e na área do aluno. Para marcar quem já fez, abra o cliente na aba Treinamentos.
      </span>
      {(treinamentos || []).map((t) => <EditarTreinamento key={t.id} t={t} alunos={porTreino[t.id] || 0} />)}
    </div>
  );
}

async function AbaFerramentas({ supabase }) {
  const { data: ferramentas, error } = await supabase.from('aluno_ferramentas').select('*').order('ordem').order('criado_em');
  if (error) return <FaltaSql arquivo="area-aluno-2.sql" />;
  return (
    <>
      <form action={criarFerramenta} className="card" style={{ maxWidth: 900 }}>
        <div className="pilha-p">
          <h2 className="h2">Nova ferramenta</h2>
          <span className="small muted">Planilhas, modelos, aulas gravadas, materiais: qualquer link que o aluno precise.</span>
        </div>
        <div className="form-grid">
          <div className="campo"><label htmlFor="f-tit">Nome *</label><input id="f-tit" name="titulo" required placeholder="Ex.: Planilha de DRE" /></div>
          <div className="campo"><label htmlFor="f-url">Link *</label><input id="f-url" name="url" required placeholder="https://" /></div>
          <div className="campo">
            <label htmlFor="f-prod">Para quem</label>
            <select id="f-prod" name="produto" defaultValue="">
              <option value="">Todos os alunos</option>
              {PRODUTOS.map((p) => <option key={p} value={p}>Só alunos do {p}</option>)}
            </select>
          </div>
          <div className="campo inteiro"><label htmlFor="f-desc">Descrição</label><input id="f-desc" name="descricao" placeholder="Para que serve, em uma frase" /></div>
        </div>
        <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>Adicionar ferramenta</button>
      </form>

      <section className="card">
        <h2 className="h2">Ferramentas liberadas ({(ferramentas || []).length})</h2>
        {(ferramentas || []).length === 0 ? (
          <div className="vazio">Nenhuma ferramenta ainda.</div>
        ) : (
          <div className="lista-alerta">
            {ferramentas.map((f) => (
              <div key={f.id} style={{ alignItems: 'center', opacity: f.ativo ? 1 : 0.55 }}>
                <span className="pilha-p" style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: 'var(--texto)' }}>{f.titulo}</a>
                  <span className="small muted">{f.produto ? 'Só ' + f.produto : 'Todos os alunos'}{f.descricao ? ' · ' + f.descricao : ''}</span>
                </span>
                <form action={alternarFerramenta}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="ativo" value={f.ativo ? '0' : '1'} />
                  <button type="submit" className="btn-link">{f.ativo ? 'Ocultar' : 'Mostrar'}</button>
                </form>
                <form action={removerFerramenta}>
                  <input type="hidden" name="id" value={f.id} />
                  <button type="submit" className="btn-perigo">Excluir</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

async function AbaConexoes({ supabase }) {
  const { data: conexoes, error } = await supabase
    .from('conexoes')
    .select('*')
    .order('criado_em', { ascending: false });
  if (error) return <FaltaSql arquivo="area-aluno-2.sql" />;
  const lista = conexoes || [];
  return (
    <>
      <div className="grid-kpi">
        {TIPOS_CONEXAO.map((t) => (
          <div key={t.tipo} className="kpi">
            <span className="muted">{t.nome}</span>
            <span className="valor">{lista.filter((c) => c.tipo === t.tipo && c.ativo).length}</span>
            <span className="small muted">{t.desc}</span>
          </div>
        ))}
      </div>

      <section className="card">
        <div className="pilha-p">
          <h2 className="h2">Quem está nas conexões</h2>
          <span className="small muted">Os alunos se cadastram pela área deles. Aqui você pode ocultar ou excluir qualquer cadastro.</span>
        </div>
        {lista.length === 0 ? (
          <div className="vazio">Ninguém se cadastrou ainda.</div>
        ) : (
          <div className="lista-alerta">
            {lista.map((c) => (
              <div key={c.id} style={{ alignItems: 'center', opacity: c.ativo ? 1 : 0.55 }}>
                <span className="pill t-gray" style={{ flex: '0 0 auto' }}>{tipoConexao(c.tipo).um}</span>
                <span className="pilha-p" style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <span style={{ fontWeight: 600, color: 'var(--texto)' }}>{c.empresa || c.nome}</span>
                  <span className="small muted">
                    {c.membro_id ? `Aluno: ${c.nome}` : 'Cadastrado pelo time'}{c.segmento ? ' · ' + c.segmento : ''}{c.descricao ? ' · ' + c.descricao : ''}
                  </span>
                </span>
                <form action={alternarConexao}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="ativo" value={c.ativo ? '0' : '1'} />
                  <button type="submit" className="btn-link">{c.ativo ? 'Ocultar' : 'Mostrar'}</button>
                </form>
                <form action={removerConexao}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="btn-perigo">Excluir</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <form action={criarConexao} className="card" style={{ maxWidth: 900 }}>
        <div className="pilha-p">
          <h2 className="h2">Cadastrar uma conexão</h2>
          <span className="small muted">Para parceiros estratégicos da Capital Upgrade ou alguém que não é aluno.</span>
        </div>
        <div className="form-grid">
          <div className="campo">
            <label htmlFor="x-tipo">Tipo</label>
            <select id="x-tipo" name="tipo" defaultValue="parceiro">
              {TIPOS_CONEXAO.map((t) => <option key={t.tipo} value={t.tipo}>{t.um}</option>)}
            </select>
          </div>
          <div className="campo"><label htmlFor="x-nome">Nome do contato *</label><input id="x-nome" name="nome" required /></div>
          <div className="campo"><label htmlFor="x-emp">Empresa</label><input id="x-emp" name="empresa" /></div>
          <div className="campo"><label htmlFor="x-seg">Segmento</label><input id="x-seg" name="segmento" /></div>
          <div className="campo"><label htmlFor="x-wa">WhatsApp</label><input id="x-wa" name="whatsapp" type="tel" /></div>
          <div className="campo"><label htmlFor="x-em">E-mail</label><input id="x-em" name="email" type="email" /></div>
          <div className="campo"><label htmlFor="x-site">Site</label><input id="x-site" name="site" /></div>
          <div className="campo inteiro"><label htmlFor="x-desc">O que oferece</label><input id="x-desc" name="descricao" /></div>
        </div>
        <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>Cadastrar</button>
      </form>
    </>
  );
}

async function AbaNps({ supabase }) {
  const { data: respostas, error } = await supabase
    .from('nps_respostas')
    .select('id, membro_id, nota, comentario, criado_em, membros(nome, cliente_id, clientes(empresa, produto))')
    .order('criado_em', { ascending: false })
    .limit(500);
  if (error) return <FaltaSql arquivo="area-aluno-2.sql" />;
  const r = calcNps(respostas || []);
  const zona = zonaNps(r.nps);
  const pct = (n) => (r.total ? Math.round((n / r.total) * 100) : 0);
  return (
    <>
      <div className="grid-kpi">
        <div className="kpi">
          <span className="muted">NPS</span>
          <span className="valor">{r.nps === null ? '—' : r.nps}</span>
          <span className={'pill t-' + zona.cor} style={{ alignSelf: 'flex-start' }}>{zona.nome}</span>
        </div>
        <div className="kpi">
          <span className="muted">Nota média</span>
          <span className="valor">{r.media === null ? '—' : String(r.media).replace('.', ',')}</span>
          <span className="small muted">de 0 a 10</span>
        </div>
        <div className="kpi">
          <span className="muted">Alunos que responderam</span>
          <span className="valor">{r.total}</span>
          <span className="small muted">conta a última resposta de cada um</span>
        </div>
      </div>

      <section className="card">
        <h2 className="h2">Distribuição</h2>
        <div className="graf-barras">
          {[
            ['Promotores (9 e 10)', r.promotores, 'var(--verde)'],
            ['Neutros (7 e 8)', r.neutros, 'var(--borda-forte)'],
            ['Detratores (0 a 6)', r.detratores, 'var(--coral)'],
          ].map(([nome, n, cor]) => (
            <div key={nome} className="graf-barra">
              <span className="rot">{nome}</span>
              <span className="trilho"><span style={{ width: pct(n) + '%', background: cor }} /></span>
              <span className="num">{n}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="h2">Respostas</h2>
        {(respostas || []).length === 0 ? (
          <div className="vazio">Nenhum aluno respondeu ainda. A pergunta fica na aba Avaliar da área do aluno.</div>
        ) : (
          <div className="lista-alerta">
            {respostas.map((x) => (
              <div key={x.id} style={{ alignItems: 'flex-start' }}>
                <span className={'pill ' + (x.nota >= 9 ? 't-green' : x.nota >= 7 ? 't-gray' : 't-coral')} style={{ minWidth: 40, justifyContent: 'center' }}>{x.nota}</span>
                <span className="pilha-p" style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <span>
                    {x.membros?.cliente_id ? (
                      <Link href={`/clientes/${x.membros.cliente_id}`} style={{ fontWeight: 600, color: 'var(--texto)' }}>{x.membros?.nome}</Link>
                    ) : (
                      <b>{x.membros?.nome || 'Aluno'}</b>
                    )}
                    <span className="small muted"> · {x.membros?.clientes?.produto || ''} · {fmtDia(x.criado_em)}</span>
                  </span>
                  {x.comentario ? <span style={{ color: 'var(--texto2)' }}>{x.comentario}</span> : null}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default async function AreaDoAlunoTime({ searchParams }) {
  const aba = ABAS.some(([k]) => k === searchParams?.aba) ? searchParams.aba : 'alunos';
  const supabase = createClient();
  return (
    <>
      <div className="topo">
        <div>
          <span className="eyebrow">Sucesso do Cliente</span>
          <h1 className="titulo">Área do aluno</h1>
          <span className="small" style={{ color: 'var(--texto3)' }}>O que os alunos veem quando entram: treinamentos, ferramentas, conexões e a avaliação (NPS).</span>
        </div>
        <div className="linha">
        <Link href="/aluno" className="btn btn-sec">Ver como aluno</Link>
        <div className="segmentos" role="group" aria-label="Partes da área do aluno">
          {ABAS.map(([k, nome]) => (
            <Link key={k} href={k === 'alunos' ? '/treinamentos' : `/treinamentos?aba=${k}`} className={aba === k ? 'ativo' : ''}>{nome}</Link>
          ))}
        </div>
        </div>
      </div>
      {aba === 'alunos' ? <AbaAlunos supabase={supabase} q={searchParams?.q} /> : null}
      {aba === 'ferramentas' ? <AbaFerramentas supabase={supabase} /> : null}
      {aba === 'conexoes' ? <AbaConexoes supabase={supabase} /> : null}
      {aba === 'nps' ? <AbaNps supabase={supabase} /> : null}
      {aba === 'treinamentos' ? <AbaTreinamentos supabase={supabase} /> : null}
    </>
  );
}
