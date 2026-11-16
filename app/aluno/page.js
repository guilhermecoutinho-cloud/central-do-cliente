import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { usuarioId } from '@/lib/supabase/usuario';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { sair } from '@/app/login/actions';
import { removerMinhaConexao, responderNps, salvarMinhaConexao } from '@/app/actions-aluno';
import { TIPOS_CONEXAO, linkWhatsApp } from '@/lib/aluno';
import CapaTreinamento from '@/components/CapaTreinamento';
import TrocarSenha from '@/components/TrocarSenha';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Área do aluno · Capital Upgrade' };

const ABAS = [
  ['treinamentos', 'Treinamentos'],
  ['encontros', 'Próximos encontros'],
  ['ferramentas', 'Ferramentas'],
  ['conexoes', 'Conexões'],
  ['avaliar', 'Avaliar'],
];

function saudacao() {
  const h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

const tz = { timeZone: 'America/Sao_Paulo' };
const dia = (d) => new Date(d).toLocaleDateString('pt-BR', { ...tz, day: '2-digit' });
const mes = (d) => new Date(d).toLocaleDateString('pt-BR', { ...tz, month: 'short' }).replace('.', '');
const semana = (d) => new Date(d).toLocaleDateString('pt-BR', { ...tz, weekday: 'long' });
const hora = (d) => new Date(d).toLocaleTimeString('pt-BR', { ...tz, hour: '2-digit', minute: '2-digit' });
const fmtDia = (d) => new Date(d).toLocaleDateString('pt-BR', tz);

function SemLiberacao() {
  return (
    <div className="publico" style={{ alignItems: 'center' }}>
      <div className="caixa" style={{ maxWidth: 480 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-caup.png" alt="Capital Upgrade Campinas" className="logo" width="180" height="50" />
        <div className="card">
          <h1 className="h2">Seu acesso ainda não foi liberado</h1>
          <p className="muted" style={{ margin: 0 }}>Fale com o time de Sucesso do Cliente da Capital Upgrade.</p>
          <form action={sair}><button type="submit" className="btn btn-sec">Sair</button></form>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Abas

function AbaTreinamentos({ lista, feito }) {
  const concluidos = lista.filter((t) => feito[t.id]);
  const proximos = lista.filter((t) => !feito[t.id]);
  return (
    <>
      {concluidos.length ? (
        <section className="pilha" style={{ gap: 14 }}>
          <h2 className="h2">Seus treinamentos</h2>
          <div className="capas grandes">
            {concluidos.map((t) => (
              <div key={t.id} className="pilha-p" style={{ gap: 8 }}>
                <CapaTreinamento t={t} feito data={feito[t.id]} />
                {t.descricao ? <span className="small muted">{t.descricao}</span> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {proximos.length ? (
        <section className="pilha" style={{ gap: 14 }}>
          <h2 className="h2">{concluidos.length ? 'Próximos passos' : 'Treinamentos da Capital Upgrade'}</h2>
          <div className="capas grandes">
            {proximos.map((t) => (
              <div key={t.id} className="pilha-p" style={{ gap: 8 }}>
                <CapaTreinamento t={t} rotuloPendente="Ainda não fez" />
                {t.descricao ? <span className="small muted">{t.descricao}</span> : null}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="aviso t-green">Você já fez todos os treinamentos da Capital Upgrade. Parabéns!</div>
      )}
    </>
  );
}

function AbaEncontros({ encontros, produto }) {
  if (!encontros.length) {
    return <div className="vazio" style={{ padding: 28, fontSize: 14 }}>Nenhum encontro do {produto} marcado por enquanto. Assim que tiver data, ele aparece aqui.</div>;
  }
  return (
    <section className="pilha" style={{ gap: 12 }}>
      <h2 className="h2">Próximos encontros do {produto}</h2>
      {encontros.map((e, i) => (
        <div key={e.id} className={'card encontro-aluno' + (i === 0 ? ' proximo' : '')}>
          <div className="encontro-data">
            <span className="d">{dia(e.data)}</span>
            <span className="m">{mes(e.data)}</span>
          </div>
          <div className="pilha-p" style={{ flex: 1, minWidth: 0, gap: 4 }}>
            {i === 0 ? <span className="small" style={{ color: 'var(--verde)', fontWeight: 600 }}>Próximo encontro</span> : null}
            <span style={{ fontWeight: 600, fontSize: 16 }}>{e.titulo}</span>
            <span className="small muted" style={{ textTransform: 'capitalize' }}>{semana(e.data)} · {hora(e.data)}</span>
          </div>
          {e.link ? (
            <a href={e.link} target="_blank" rel="noopener noreferrer" className={'btn ' + (i === 0 ? '' : 'btn-sec ') + 'btn-p'}>Entrar no encontro</a>
          ) : (
            <span className="small muted" style={{ maxWidth: 180, textAlign: 'right' }}>O link chega pelo time da Capital Upgrade</span>
          )}
        </div>
      ))}
    </section>
  );
}

function AbaFerramentas({ ferramentas }) {
  if (!ferramentas.length) {
    return <div className="vazio" style={{ padding: 28, fontSize: 14 }}>As ferramentas da Capital Upgrade vão aparecer aqui.</div>;
  }
  return (
    <section className="pilha" style={{ gap: 14 }}>
      <h2 className="h2">Ferramentas</h2>
      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))' }}>
        {ferramentas.map((f) => (
          <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="card ferramenta">
            <span style={{ fontWeight: 600, fontSize: 15 }}>{f.titulo}</span>
            {f.descricao ? <span className="small" style={{ color: 'var(--texto3)', lineHeight: 1.5 }}>{f.descricao}</span> : null}
            <span className="small" style={{ color: 'var(--verde)', fontWeight: 600, marginTop: 'auto' }}>Abrir</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function CartaoConexao({ c }) {
  const wa = linkWhatsApp(c.whatsapp);
  return (
    <div className="card" style={{ gap: 10 }}>
      <div className="pilha-p" style={{ gap: 2 }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{c.empresa || c.nome}</span>
        <span className="small muted">{c.empresa ? c.nome : ''}{c.empresa && c.segmento ? ' · ' : ''}{c.segmento || ''}</span>
      </div>
      {c.descricao ? <span className="small" style={{ color: 'var(--texto3)', lineHeight: 1.5 }}>{c.descricao}</span> : null}
      <div className="linha" style={{ gap: 12, marginTop: 'auto' }}>
        {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="small" style={{ fontWeight: 600 }}>WhatsApp</a> : null}
        {c.email ? <a href={'mailto:' + c.email} className="small" style={{ fontWeight: 600 }}>E-mail</a> : null}
        {c.site ? <a href={c.site} target="_blank" rel="noopener noreferrer" className="small" style={{ fontWeight: 600 }}>Site</a> : null}
      </div>
    </div>
  );
}

function AbaConexoes({ conexoes, minha, filtro, eu, previa, base }) {
  const tipo = TIPOS_CONEXAO.find((t) => t.tipo === filtro) || TIPOS_CONEXAO[0];
  const lista = conexoes.filter((c) => c.tipo === tipo.tipo && c.ativo);
  return (
    <>
      <section className="pilha" style={{ gap: 14 }}>
        <div className="entre" style={{ alignItems: 'flex-end' }}>
          <div className="pilha-p">
            <h2 className="h2">Conexões entre os alunos</h2>
            <span className="small muted">{tipo.desc}</span>
          </div>
          <div className="segmentos" role="group" aria-label="Tipo de conexão">
            {TIPOS_CONEXAO.map((t) => (
              <Link key={t.tipo} href={`${base}aba=conexoes&tipo=${t.tipo}`} className={t.tipo === tipo.tipo ? 'ativo' : ''}>
                {t.nome} ({conexoes.filter((c) => c.tipo === t.tipo && c.ativo).length})
              </Link>
            ))}
          </div>
        </div>
        {lista.length ? (
          <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))' }}>
            {lista.map((c) => <CartaoConexao key={c.id} c={c} />)}
          </div>
        ) : (
          <div className="vazio" style={{ padding: 24, fontSize: 14 }}>Ninguém em {tipo.nome.toLowerCase()} ainda. Que tal ser o primeiro?</div>
        )}
      </section>

      <form action={salvarMinhaConexao} className="card" style={{ maxWidth: 860 }}>
        <div className="pilha-p">
          <h2 className="h2">{minha ? 'Seu cadastro nas conexões' : 'Apareça nas conexões'}</h2>
          <span className="small muted">Os outros alunos da Capital Upgrade veem o que você colocar aqui e podem falar com você.</span>
        </div>
        <div className="form-grid">
          <div className="campo">
            <label htmlFor="c-tipo">Você é</label>
            <select id="c-tipo" name="tipo" defaultValue={minha?.tipo || 'fornecedor'}>
              {TIPOS_CONEXAO.map((t) => <option key={t.tipo} value={t.tipo}>{t.um}</option>)}
            </select>
          </div>
          <div className="campo"><label htmlFor="c-emp">Empresa</label><input id="c-emp" name="empresa" defaultValue={minha?.empresa || eu.empresa || ''} /></div>
          <div className="campo"><label htmlFor="c-seg">Segmento</label><input id="c-seg" name="segmento" placeholder="Ex.: construção civil, cosméticos" defaultValue={minha?.segmento || ''} /></div>
          <div className="campo"><label htmlFor="c-wa">WhatsApp</label><input id="c-wa" name="whatsapp" type="tel" defaultValue={minha?.whatsapp || ''} /></div>
          <div className="campo"><label htmlFor="c-em">E-mail</label><input id="c-em" name="email" type="email" defaultValue={minha?.email || ''} /></div>
          <div className="campo"><label htmlFor="c-site">Site ou Instagram</label><input id="c-site" name="site" defaultValue={minha?.site || ''} /></div>
          <div className="campo inteiro"><label htmlFor="c-desc">O que você oferece ou procura</label><textarea id="c-desc" name="descricao" rows={3} defaultValue={minha?.descricao || ''} /></div>
        </div>
        <div className="linha">
          <button type="submit" className="btn" disabled={previa}>{minha ? 'Salvar' : 'Publicar nas conexões'}</button>
          {previa ? <span className="small muted">No modo de visualização nada é enviado.</span> : null}
          {minha && !minha.ativo ? <span className="small" style={{ color: 'var(--amber)' }}>Seu cadastro está oculto pelo time da Capital Upgrade.</span> : null}
        </div>
      </form>
      {minha ? (
        <form action={removerMinhaConexao}>
          <button type="submit" className="btn-perigo" disabled={previa}>Sair das conexões</button>
        </form>
      ) : null}
    </>
  );
}

function AbaAvaliar({ ultima, previa }) {
  return (
    <form action={responderNps} className="card" style={{ maxWidth: 760 }}>
      <div className="pilha-p" style={{ gap: 6 }}>
        <h2 className="h2">De 0 a 10, quanto você recomendaria a Capital Upgrade para um amigo empresário?</h2>
        <span className="small muted">Sua resposta vai direto para o time de Sucesso do Cliente.</span>
      </div>
      <div className="nps-notas" role="radiogroup" aria-label="Nota de 0 a 10">
        {Array.from({ length: 11 }, (_, n) => (
          <label key={n} className="nps-nota">
            <input type="radio" name="nota" value={n} required defaultChecked={ultima?.nota === n} />
            <span>{n}</span>
          </label>
        ))}
      </div>
      <div className="entre small muted" style={{ marginTop: -4 }}>
        <span>Nada provável</span>
        <span>Com certeza</span>
      </div>
      <div className="campo">
        <label htmlFor="nps-com">Quer contar o porquê? (opcional)</label>
        <textarea id="nps-com" name="comentario" rows={3} />
      </div>
      <div className="linha">
        <button type="submit" className="btn" disabled={previa}>Enviar avaliação</button>
        {previa ? <span className="small muted">No modo de visualização nada é enviado.</span> : null}
        {ultima ? <span className="small muted">Sua última nota foi {ultima.nota}, em {fmtDia(ultima.criado_em)}. Obrigado!</span> : null}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Página

// Lista para o time escolher qual aluno quer ver
async function EscolherAluno({ supabase, q }) {
  let consulta = supabase
    .from('membros')
    .select('id, nome, email, user_id, clientes!inner(nome, empresa, produto, status)')
    .neq('clientes.status', 'encerrado')
    .order('nome')
    .limit(60);
  if (q) consulta = consulta.ilike('nome', '%' + q.replace(/[%_\\]/g, '') + '%');
  const { data: alunos } = await consulta;
  return (
    <div className="aluno-pagina">
      <div className="faixa-previa">
        <span>Ver como aluno: escolha de quem é a visão</span>
        <Link href="/" className="btn btn-sec btn-p">Voltar para a Central</Link>
      </div>
      <main className="aluno-conteudo" style={{ maxWidth: 900 }}>
        <section className="pilha" style={{ gap: 8 }}>
          <h1 className="titulo-m">Ver a área do aluno como</h1>
          <span className="small muted">Você vê exatamente o que a pessoa vê: treinamentos, encontros, ferramentas, conexões e avaliação. Nada é alterado.</span>
        </section>
        <form className="linha" action="/aluno">
          <input className="input" name="q" defaultValue={q || ''} placeholder="Buscar pelo nome do aluno" style={{ flex: 1, minWidth: 200 }} />
          <button type="submit" className="btn btn-sec">Buscar</button>
        </form>
        <section className="card" style={{ padding: 0 }}>
          {(alunos || []).length === 0 ? (
            <div className="vazio" style={{ margin: 16 }}>Ninguém encontrado.</div>
          ) : (
            (alunos || []).map((a) => (
              <Link key={a.id} href={`/aluno?ver=${a.id}`} className="linha-aluno">
                <span className="pilha-p" style={{ gap: 2, minWidth: 0 }}>
                  <span style={{ fontWeight: 600 }}>{a.nome}</span>
                  <span className="small muted">
                    {a.clientes?.empresa && a.clientes.empresa !== a.nome ? a.clientes.empresa : a.clientes?.nome !== a.nome ? 'Time de ' + a.clientes?.nome : 'Titular'}
                  </span>
                </span>
                <span className="linha" style={{ gap: 8 }}>
                  <span className="pill t-gray">{a.clientes?.produto}</span>
                  {a.user_id ? <span className="pill t-green">Tem acesso</span> : null}
                </span>
              </Link>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

export default async function AreaDoAluno({ searchParams }) {
  const supabase = createClient();
  const id = await usuarioId(supabase);
  if (!id) redirect('/login');

  // Quem é aluno vê a própria área. Quem é do time (com Sucesso do Cliente) pode "ver como" qualquer aluno.
  const { data: cadastro } = await supabase.rpc('meu_cadastro_aluno');
  let eu = Array.isArray(cadastro) ? cadastro[0] : cadastro;
  let previa = false;
  let acessoLiberado = true;

  if (!eu) {
    const perfil = await getPerfil();
    if (perfil && !perfil.semEquipe && !perfil.erro) {
      if (!podeSetor(perfil, 'sucesso')) redirect('/');
      if (!searchParams?.ver) return <EscolherAluno supabase={supabase} q={searchParams?.q} />;
      const { data: m } = await supabase
        .from('membros')
        .select('id, nome, acesso_liberado, clientes(nome, empresa, produto)')
        .eq('id', searchParams.ver)
        .maybeSingle();
      if (!m) return <EscolherAluno supabase={supabase} q={searchParams?.q} />;
      eu = { membro_id: m.id, nome: m.nome, empresa: m.clientes?.empresa, produto: m.clientes?.produto };
      acessoLiberado = !!m.acesso_liberado;
      previa = true;
    } else {
      return <SemLiberacao />;
    }
  }

  const aba = ABAS.some(([k]) => k === searchParams?.aba) ? searchParams.aba : 'treinamentos';
  const base = previa ? `/aluno?ver=${eu.membro_id}&` : '/aluno?';
  const agoraMenos3h = new Date(Date.now() - 3 * 3600 * 1000).toISOString();

  // Sempre: treinamentos (para o progresso do topo). O resto só na aba aberta.
  // Os filtros por membro valem para os dois casos: para o aluno o banco já limita ao que é dele.
  const [{ data: treinamentos }, { data: checks }, extra] = await Promise.all([
    supabase.from('treinamentos').select('id, sigla, nome, descricao, capa_url, ordem').eq('ativo', true).order('ordem'),
    supabase.from('aluno_treinamentos').select('treinamento_id, concluido_em').eq('membro_id', eu.membro_id),
    aba === 'encontros'
      ? previa
        ? supabase.from('encontros').select('id, produto, titulo, data, link').eq('produto', eu.produto).gt('data', agoraMenos3h).order('data').limit(12)
        : supabase.rpc('meus_proximos_encontros')
      : aba === 'ferramentas'
        ? supabase.from('aluno_ferramentas').select('id, titulo, descricao, url, produto').eq('ativo', true).order('ordem').order('criado_em')
        : aba === 'conexoes'
          ? supabase.from('conexoes').select('id, membro_id, tipo, nome, empresa, segmento, descricao, whatsapp, email, site, ativo').or(`ativo.eq.true,membro_id.eq.${eu.membro_id}`).order('criado_em', { ascending: false })
          : aba === 'avaliar'
            ? supabase.from('nps_respostas').select('nota, criado_em').eq('membro_id', eu.membro_id).order('criado_em', { ascending: false }).limit(1)
            : Promise.resolve({ data: null }),
  ]);
  const encontros = aba === 'encontros' && previa ? (extra.data || []).map((e) => ({ ...e, link: acessoLiberado ? e.link : null })) : extra?.data;

  const feito = Object.fromEntries((checks || []).map((c) => [c.treinamento_id, c.concluido_em]));
  const lista = treinamentos || [];
  const nConcluidos = lista.filter((t) => feito[t.id]).length;
  const pct = lista.length ? Math.round((nConcluidos / lista.length) * 100) : 0;
  const primeiroNome = String(eu.nome || '').split(' ')[0];
  const faltaSql = extra?.error && aba !== 'treinamentos';

  return (
    <div className="aluno-pagina">
      {previa ? (
        <div className="faixa-previa">
          <span>Você está vendo a área do aluno como <b>{eu.nome}</b>. Nada é alterado.</span>
          <span className="linha" style={{ gap: 10 }}>
            <Link href="/aluno" className="btn btn-sec btn-p">Trocar aluno</Link>
            <Link href="/" className="btn btn-p">Voltar para a Central</Link>
          </span>
        </div>
      ) : null}
      <header className="aluno-topo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-caup.png" alt="Capital Upgrade Campinas" width="150" height="42" className="aluno-logo" />
        <div className="linha" style={{ gap: 16 }}>
          {previa ? (
            <span className="small muted">Trocar senha · Sair</span>
          ) : (
            <>
              <TrocarSenha />
              <form action={sair}><button type="submit" className="btn btn-sec btn-p">Sair</button></form>
            </>
          )}
        </div>
      </header>

      <main className="aluno-conteudo">
        <section className="pilha" style={{ gap: 10 }}>
          <span className="eyebrow muted">{eu.empresa && eu.empresa !== eu.nome ? eu.empresa : 'Área do aluno'}</span>
          <h1 className="titulo">{saudacao()}, {primeiroNome}</h1>
          <div className="pilha-p" style={{ gap: 8, maxWidth: 520 }}>
            <span style={{ color: 'var(--texto3)' }}>
              Você concluiu <b style={{ color: 'var(--texto)' }}>{nConcluidos} de {lista.length}</b> treinamentos da Capital Upgrade.
            </span>
            <div className="barra"><span style={{ width: pct + '%', background: 'var(--verde)' }} /></div>
          </div>
        </section>

        <nav className="segmentos aluno-abas" aria-label="Seções da área do aluno">
          {ABAS.map(([k, nome]) => (
            <Link key={k} href={k === 'treinamentos' ? base.replace(/[?&]$/, '') : `${base}aba=${k}`} className={aba === k ? 'ativo' : ''}>{nome}</Link>
          ))}
        </nav>

        {faltaSql ? (
          <div className="vazio" style={{ padding: 28, fontSize: 14 }}>Esta parte está sendo preparada. Volte em breve.</div>
        ) : aba === 'encontros' ? (
          <AbaEncontros encontros={encontros || []} produto={eu.produto} />
        ) : aba === 'ferramentas' ? (
          <AbaFerramentas ferramentas={(extra.data || []).filter((f) => !f.produto || f.produto === eu.produto)} />
        ) : aba === 'conexoes' ? (
          <AbaConexoes
            conexoes={extra.data || []}
            minha={(extra.data || []).find((c) => c.membro_id === eu.membro_id) || null}
            filtro={searchParams?.tipo}
            eu={eu}
            previa={previa}
            base={base}
          />
        ) : aba === 'avaliar' ? (
          <AbaAvaliar ultima={(extra.data || [])[0] || null} previa={previa} />
        ) : (
          <AbaTreinamentos lista={lista} feito={feito} />
        )}
      </main>
    </div>
  );
}
