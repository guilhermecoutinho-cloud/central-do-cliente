import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { setorPorSlug } from '@/lib/setores';
import { CORES_GRUPO, atrasada, fmtPrazo, fmtQuando, hojeISO } from '@/lib/tarefas';
import { resumoPainel } from '@/lib/painel';
import { corAvatar, iniciais } from '@/lib/util';
import Icone from '@/components/Icone';
import SetorAbas from '@/components/SetorAbas';
import SemAcesso from '@/components/SemAcesso';

function Avatar({ pessoa, tamanho = 30 }) {
  if (!pessoa || !pessoa.user_id) return <span className="av-vazio" style={{ width: tamanho, height: tamanho }} aria-hidden="true">–</span>;
  return (
    <span className={'av t-' + corAvatar(pessoa.user_id)} style={{ width: tamanho, height: tamanho, borderRadius: '50%', fontSize: 11 }} title={pessoa.nome}>
      {iniciais(pessoa.nome)}
    </span>
  );
}

export default async function PainelSetor({ params }) {
  const setor = setorPorSlug(params.slug);
  if (!setor) notFound();

  const perfil = await getPerfil();
  if (!podeSetor(perfil, setor.slug)) return <SemAcesso setor={setor.nome} />;
  if (perfil.semMigracao) {
    return <div className="card">Rode o arquivo supabase/central-empresa.sql no Supabase para ativar as tarefas e o painel.</div>;
  }

  const supabase = createClient();
  const [{ data: tarefas, error }, { data: grupos }, { data: equipe }, { data: atividade }] = await Promise.all([
    supabase.from('tarefas').select('id, titulo, status, prioridade, responsavel, prazo, grupo_id, concluida_em').eq('setor', setor.slug),
    supabase.from('tarefa_grupos').select('id, nome, cor, ordem').eq('setor', setor.slug).order('ordem').order('criado_em'),
    supabase.from('equipe').select('user_id, nome').order('nome'),
    supabase
      .from('tarefa_atividade')
      .select('id, autor_nome, texto, criado_em, tarefa_id, tarefas!inner(titulo, setor)')
      .eq('tarefas.setor', setor.slug)
      .order('criado_em', { ascending: false })
      .limit(8),
  ]);
  if (error) throw new Error(error.message);

  const hoje = hojeISO();
  const lista = tarefas || [];
  const r = resumoPainel(lista, grupos || [], equipe || [], hoje);
  const pessoaPorId = Object.fromEntries((equipe || []).map((p) => [p.user_id, p]));

  const kpis = [
    { nome: 'Tarefas abertas', valor: r.abertas, cor: 'blue', icone: 'check', extra: r.travadas ? `${r.travadas} travada${r.travadas > 1 ? 's' : ''}` : 'nenhuma travada' },
    { nome: 'Atrasadas', valor: r.atrasadas, cor: 'coral', icone: 'relogio', destaque: r.atrasadas > 0, extra: r.atrasadas ? 'precisam de atenção' : 'tudo em dia' },
    { nome: 'Vencem em 7 dias', valor: r.semana, cor: 'amber', icone: 'calendario', extra: 'a partir de hoje' },
    { nome: 'Concluídas em 30 dias', valor: r.feitas30, cor: 'green', icone: 'trofeu', destaque: r.feitas30 > 0, extra: r.pctNoPrazo === null ? 'sem prazo para comparar' : `${r.pctNoPrazo}% dentro do prazo` },
  ];

  return (
    <>
      <div className="topo">
        <div className="pilha-p">
          <span className={'selo tom-' + setor.cor}><span className="sigla">{setor.sigla}</span>{setor.nome}</span>
          <h1 className="titulo">Painel de {setor.nome}</h1>
          <span className="small" style={{ color: 'var(--texto3)' }}>Visão geral de como o setor está hoje</span>
        </div>
        <SetorAbas slug={setor.slug} ativo="painel" />
      </div>

      <div className="grid-kpi">
        {kpis.map((k) => (
          <div key={k.nome} className={'kpi tom-' + k.cor}>
            <span className="icone"><Icone nome={k.icone} tamanho={20} /></span>
            <span className="muted">{k.nome}</span>
            <span className={'valor' + (k.destaque ? ' cor' : '')}>{k.valor}</span>
            <span className="small muted">{k.extra}</span>
          </div>
        ))}
      </div>

      {r.total === 0 ? (
        <div className="vazio" style={{ padding: 28, fontSize: 14 }}>
          Ainda não há tarefas neste setor. <Link href={`/setor/${setor.slug}`}>Criar a primeira no quadro</Link>
        </div>
      ) : null}

      <div className="grid-painel">
        <section className="card">
          <div className="entre">
            <h2 className="h2">Andamento geral</h2>
            <span className="small muted">{r.total} {r.total === 1 ? 'tarefa' : 'tarefas'} no total</span>
          </div>
          <div className="linha" style={{ gap: 22, alignItems: 'center' }}>
            <div className="anel anel-g" style={{ background: `conic-gradient(var(--verde) ${r.pctFeito}%, var(--borda) 0)` }}>
              <span>
                {r.pctFeito}%
                <small>concluído</small>
              </span>
            </div>
            <div className="pilha" style={{ flex: '1 1 220px', gap: 10 }}>
              <div className="barra-seg" aria-hidden="true">
                {r.porStatus.map((s) => (s.n ? <span key={s.nome} style={{ width: (s.n / Math.max(1, r.total)) * 100 + '%', background: s.bg }} /> : null))}
              </div>
              <div className="linha" style={{ gap: 6 }}>
                {r.porStatus.map((s) => (
                  <span key={s.nome} className="pill" style={{ background: s.bg, color: s.fg }}>{s.nome} · {s.n}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="pilha-p">
            <span className="small muted">Prioridade das tarefas abertas</span>
            <div className="linha" style={{ gap: 6 }}>
              {r.porPrioridade.map((p) => (
                <span key={p.nome} className="pill" style={{ background: p.n ? p.bg : 'var(--card2)', color: p.n ? p.fg : 'var(--muted2)' }}>{p.nome} · {p.n}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="entre">
            <h2 className="h2">Concluídas por semana</h2>
            <span className="small muted">últimas 8 semanas</span>
          </div>
          <div className="graf-colunas" role="img" aria-label={'Tarefas concluídas por semana: ' + r.semanas.map((s) => `${s.rotulo}: ${s.n}`).join(', ')}>
            {r.semanas.map((s, i) => (
              <div key={s.ini} className={'graf-col' + (s.atual ? ' atual' : '')}>
                <span className="n">{s.n}</span>
                <span className="b" style={{ height: Math.max(4, (s.n / r.maiorSemana) * 120) + 'px', animationDelay: i * 0.04 + 's' }} />
                <span className="r">{s.atual ? 'Esta' : s.rotulo}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid-painel">
        <section className="card">
          <div className="entre">
            <h2 className="h2">Carga do time</h2>
            <span className="small muted">tarefas abertas por pessoa</span>
          </div>
          {r.pessoas.length === 0 ? (
            <div className="vazio">Ninguém com tarefa aberta.</div>
          ) : (
            <div className="pilha" style={{ gap: 14 }}>
              {r.pessoas.map((p) => (
                <div key={p.user_id || 'ninguem'} className="linha" style={{ gap: 12, flexWrap: 'nowrap' }}>
                  <Avatar pessoa={p} />
                  <div className="pilha-p" style={{ flex: 1, minWidth: 0, gap: 6 }}>
                    <div className="entre" style={{ gap: 8, flexWrap: 'nowrap' }}>
                      <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</span>
                      <span className="small" style={{ color: 'var(--texto3)', whiteSpace: 'nowrap' }}>
                        {p.abertas} {p.abertas === 1 ? 'aberta' : 'abertas'}
                        {p.atrasadas ? <span style={{ color: 'var(--coral)', fontWeight: 700 }}> · {p.atrasadas} atrasada{p.atrasadas > 1 ? 's' : ''}</span> : null}
                      </span>
                    </div>
                    <div style={{ width: (p.abertas / r.maiorCarga) * 100 + '%', minWidth: 24 }}>
                      <div className="barra-seg" title={p.porStatus.map((s) => `${s.nome}: ${s.n}`).join(' · ')}>
                        {p.porStatus.map((s) => (s.n ? <span key={s.nome} style={{ width: (s.n / p.abertas) * 100 + '%', background: s.bg }} /> : null))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="entre">
            <h2 className="h2">Prazos</h2>
            <span className="small muted">atrasadas e próximos 7 dias</span>
          </div>
          {r.proximos.length === 0 ? (
            <div className="vazio">Nenhum prazo apertado. Tudo tranquilo por aqui.</div>
          ) : (
            <div className="lista-alerta">
              {r.proximos.map((t) => {
                const atr = atrasada(t, hoje);
                return (
                  <div key={t.id} style={{ alignItems: 'center' }}>
                    <span className={'tag ' + (atr ? 't-coral' : t.prazo === hoje ? 't-amber' : 't-gray')} style={{ flexBasis: 78 }}>
                      {fmtPrazo(t.prazo, hoje)}
                    </span>
                    <Link href={`/tarefas/${t.id}`} style={{ color: 'var(--texto2)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.titulo}
                    </Link>
                    <Avatar pessoa={pessoaPorId[t.responsavel]} tamanho={26} />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="grid-painel">
        <section className="card">
          <div className="entre">
            <h2 className="h2">Grupos</h2>
            <Link href={`/setor/${setor.slug}`} className="small" style={{ fontWeight: 600 }}>Abrir quadro</Link>
          </div>
          {r.porGrupo.length === 0 ? (
            <div className="vazio">Nenhum grupo criado.</div>
          ) : (
            <div className="pilha" style={{ gap: 16 }}>
              {r.porGrupo.map((g) => {
                const cor = CORES_GRUPO[g.cor] || CORES_GRUPO.green;
                return (
                  <div key={g.id} className="pilha-p" style={{ gap: 8 }}>
                    <div className="entre" style={{ gap: 8 }}>
                      <span style={{ fontWeight: 700, color: cor }}>{g.nome}</span>
                      <span className="small" style={{ color: 'var(--texto3)' }}>
                        {g.feitas} de {g.total} · {g.pct}%
                        {g.atrasadas ? <span style={{ color: 'var(--coral)', fontWeight: 700 }}> · {g.atrasadas} atrasada{g.atrasadas > 1 ? 's' : ''}</span> : null}
                      </span>
                    </div>
                    <div className="barra"><span style={{ width: g.pct + '%', background: cor }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="h2">Atividade recente</h2>
          {(atividade || []).length === 0 ? (
            <div className="vazio">Nada registrado ainda.</div>
          ) : (
            <div className="lista-alerta">
              {atividade.map((a) => (
                <div key={a.id}>
                  <span className="pilha-p" style={{ gap: 3, minWidth: 0 }}>
                    <span>
                      <b style={{ color: 'var(--texto)' }}>{a.autor_nome || 'Alguém'}</b> {a.texto}
                    </span>
                    <span className="small muted">
                      <Link href={`/tarefas/${a.tarefa_id}`} className="muted">{a.tarefas?.titulo}</Link> · {fmtQuando(a.criado_em)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
