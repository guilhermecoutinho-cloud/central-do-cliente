import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getPerfil } from '@/lib/perfil';
import { SETORES, SLUGS } from '@/lib/setores';
import { STATUS, atrasada, hojeISO } from '@/lib/tarefas';
import { diasAtraso, resumoPainel, saudeArea, semanasPorSetor } from '@/lib/painel';
import { fmtMoeda } from '@/lib/cashback';
import { COR_PRODUTO, PRODUTOS, corAvatar, fmtDataHora, iniciais } from '@/lib/util';
import Icone from '@/components/Icone';
import SetorIcone from '@/components/SetorIcone';
import SemAcesso from '@/components/SemAcesso';

const SETOR = Object.fromEntries(SETORES.map((s) => [s.slug, s]));

export default async function Lideranca() {
  const perfil = await getPerfil();
  if (!perfil.admin) return <SemAcesso setor="Liderança" />;

  const supabase = createClient();
  const agora = new Date();
  const [tarefasRes, { data: equipe }, { data: clientes }, { data: encontros }, { data: porEncontro }, saldosRes] = await Promise.all([
    perfil.semMigracao
      ? Promise.resolve({ data: [] })
      : supabase.from('tarefas').select('id, titulo, setor, status, prioridade, responsavel, prazo, grupo_id, concluida_em'),
    supabase.from('equipe').select('user_id, nome').order('nome'),
    supabase.from('clientes').select('id, status').neq('status', 'encerrado'),
    supabase.from('encontros').select('id, produto, titulo, data').order('data'),
    supabase.from('presenca_encontro').select('encontro_id, presentes, faltas'),
    supabase.from('cashback_saldos').select('saldo'),
  ]);

  const hoje = hojeISO();
  const tarefas = tarefasRes.data || [];
  const pessoaPorId = Object.fromEntries((equipe || []).map((p) => [p.user_id, p]));

  // Empresa inteira
  const geral = resumoPainel(tarefas, [], equipe || [], hoje);
  const ritmo = semanasPorSetor(tarefas, SLUGS, hoje);
  const ultimas4 = ritmo.semanas.slice(4).reduce((t, s) => t + s.n, 0);
  const anteriores4 = ritmo.semanas.slice(0, 4).reduce((t, s) => t + s.n, 0);
  const variacao = anteriores4 ? Math.round(((ultimas4 - anteriores4) / anteriores4) * 100) : null;

  // Cada área
  const areas = SETORES.map((s) => {
    const doSetor = tarefas.filter((t) => t.setor === s.slug);
    const r = resumoPainel(doSetor, [], [], hoje);
    return { ...s, r, saude: saudeArea(r.abertas, r.atrasadas, r.total) };
  });

  // Atrasadas da empresa, das mais antigas para as mais novas
  const atrasadas = tarefas
    .filter((t) => atrasada(t, hoje))
    .sort((a, b) => (a.prazo < b.prazo ? -1 : 1))
    .slice(0, 7);

  // Sucesso do Cliente
  const listaClientes = clientes || [];
  const ativos = listaClientes.length;
  const emOnboarding = listaClientes.filter((c) => c.status === 'onboarding').length;
  const resumoPorEncontro = Object.fromEntries((porEncontro || []).map((p) => [p.encontro_id, p]));
  const comChamada = (encontros || []).filter((e) => new Date(e.data) <= agora && resumoPorEncontro[e.id]);
  const ultimoEnc = comChamada[comChamada.length - 1];
  let presencaPct = null;
  if (ultimoEnc) {
    const { presentes, faltas } = resumoPorEncontro[ultimoEnc.id];
    const total = Number(presentes) + Number(faltas);
    presencaPct = total ? Math.round((Number(presentes) / total) * 100) : null;
  }
  const futuros = (encontros || []).filter((e) => new Date(e.data) > agora);
  const proximosPorProduto = PRODUTOS.map((p) => ({ p, e: futuros.find((e) => e.produto === p) }));
  const cashbackAberto = saldosRes.error ? null : (saldosRes.data || []).reduce((t, s) => t + Number(s.saldo || 0), 0);

  // Time: quem está com mais tarefas abertas
  const time = geral.pessoas.filter((p) => p.user_id).slice(0, 6);

  const hora = agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <div className="topo">
        <div className="pilha-p">
          <span className="eyebrow" style={{ textTransform: 'capitalize' }}>
            {agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h1 className="titulo">Visão da liderança</h1>
          <span className="small" style={{ color: 'var(--texto3)' }}>Como cada área da empresa está hoje</span>
        </div>
        <span className="pill t-gray">Atualizado às {hora}</span>
      </div>

      <div className="grid-kpi">
        <div className="kpi tom-blue">
          <span className="icone"><Icone nome="check" tamanho={20} /></span>
          <span className="muted">Tarefas abertas na empresa</span>
          <span className="valor">{geral.abertas}</span>
          <span className="small muted">{geral.travadas ? `${geral.travadas} travada${geral.travadas > 1 ? 's' : ''}` : 'nenhuma travada'}</span>
        </div>
        <div className="kpi tom-coral">
          <span className="icone"><Icone nome="relogio" tamanho={20} /></span>
          <span className="muted">Atrasadas</span>
          <span className={'valor' + (geral.atrasadas ? ' cor' : '')}>{geral.atrasadas}</span>
          <span className="small muted">{geral.abertas ? Math.round((geral.atrasadas / geral.abertas) * 100) + '% das abertas' : 'nada em aberto'}</span>
        </div>
        <div className="kpi tom-green">
          <span className="icone"><Icone nome="trofeu" tamanho={20} /></span>
          <span className="muted">Entregues em 30 dias</span>
          <span className={'valor' + (geral.feitas30 ? ' cor' : '')}>{geral.feitas30}</span>
          <span className="small muted">{geral.pctNoPrazo === null ? 'sem prazo para comparar' : `${geral.pctNoPrazo}% dentro do prazo`}</span>
        </div>
        <div className="kpi tom-violet">
          <span className="icone"><Icone nome="pessoas" tamanho={20} /></span>
          <span className="muted">Clientes ativos</span>
          <span className="valor">{ativos}</span>
          <span className="small muted">{emOnboarding} em onboarding</span>
        </div>
      </div>

      <section className="pilha">
        <div className="entre">
          <h2 className="h2">Áreas</h2>
          <span className="small muted">clique numa área para abrir o painel dela</span>
        </div>
        <div className="grid-areas">
          {areas.map((a) => {
            const href = a.slug === 'sucesso' ? '/sucesso' : `/setor/${a.slug}/painel`;
            const maior = Math.max(1, ...a.r.semanas.map((s) => s.n));
            return (
              <Link key={a.slug} href={href} className={'card faixa area tom-' + a.cor}>
                <div className="entre" style={{ flexWrap: 'nowrap' }}>
                  <span className="linha" style={{ gap: 10, flexWrap: 'nowrap', minWidth: 0 }}>
                    <SetorIcone slug={a.slug} tamanho={36} />
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{a.nome}</span>
                  </span>
                  <span className={'pill t-' + a.saude.cor}>{a.saude.nome}</span>
                </div>

                <div className="mini-stats">
                  <span><b>{a.r.abertas}</b><small>abertas</small></span>
                  <span><b style={{ color: a.r.atrasadas ? 'var(--coral)' : undefined }}>{a.r.atrasadas}</b><small>atrasadas</small></span>
                  <span title="Entregues nos últimos 30 dias"><b>{a.r.feitas30}</b><small>no mês</small></span>
                </div>

                <div className="pilha-p" style={{ gap: 6 }}>
                  <div className="barra-seg" aria-hidden="true">
                    {a.r.porStatus.map((s) => (s.n ? <span key={s.nome} style={{ width: (s.n / Math.max(1, a.r.total)) * 100 + '%', background: s.bg }} /> : null))}
                  </div>
                  <span className="small muted">{a.r.total ? `${a.r.pctFeito}% de tudo concluído` : 'Nenhuma tarefa ainda'}</span>
                </div>

                <div className="spark" aria-label={'Entregas nas últimas 8 semanas: ' + a.r.semanas.map((s) => s.n).join(', ')} role="img">
                  {a.r.semanas.map((s, i) => (
                    <span key={s.ini} style={{ height: Math.max(3, (s.n / maior) * 34) + 'px', background: s.atual ? 'var(--verde)' : 'var(--borda-forte)', animationDelay: i * 0.03 + 's' }} />
                  ))}
                </div>

                {a.slug === 'sucesso' ? (
                  <span className="small" style={{ color: 'var(--texto3)' }}>
                    {ativos} clientes · {emOnboarding} em onboarding{presencaPct !== null ? ` · ${presencaPct}% de presença` : ''}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid-painel">
        <section className="card">
          <div className="entre">
            <h2 className="h2">Ritmo de entregas</h2>
            {variacao !== null ? (
              <span className={'pill ' + (variacao >= 0 ? 't-green' : 't-coral')}>
                {variacao >= 0 ? '+' : ''}{variacao}% vs. 4 semanas antes
              </span>
            ) : (
              <span className="small muted">últimas 8 semanas</span>
            )}
          </div>
          <div className="graf-colunas" role="img" aria-label={'Entregas por semana: ' + ritmo.semanas.map((s) => `${s.rotulo}: ${s.n}`).join(', ')}>
            {ritmo.semanas.map((s, i) => (
              <div key={s.ini} className={'graf-col' + (s.atual ? ' atual' : '')}>
                <span className="n">{s.n}</span>
                <span
                  className="b"
                  style={{ height: Math.max(4, (s.n / ritmo.maior) * 120) + 'px', animationDelay: i * 0.04 + 's' }}
                  title={SETORES.filter((st) => s.porSetor[st.slug]).map((st) => `${st.nome}: ${s.porSetor[st.slug]}`).join(' · ')}
                />
                <span className="r">{s.atual ? 'Esta' : s.rotulo}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="entre">
            <h2 className="h2">Precisa de atenção</h2>
            <span className="small muted">tarefas mais atrasadas</span>
          </div>
          {atrasadas.length === 0 ? (
            <div className="vazio">Nenhuma tarefa atrasada na empresa.</div>
          ) : (
            <div className="lista-alerta">
              {atrasadas.map((t) => {
                const s = SETOR[t.setor];
                const p = pessoaPorId[t.responsavel];
                const dias = diasAtraso(t.prazo, hoje);
                return (
                  <div key={t.id} style={{ alignItems: 'center' }}>
                    <SetorIcone slug={t.setor} tamanho={28} />
                    <Link href={`/tarefas/${t.id}`} style={{ color: 'var(--texto2)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.titulo}
                    </Link>
                    <span className="small muted" style={{ whiteSpace: 'nowrap' }}>{p ? p.nome.split(' ')[0] : 'Sem resp.'}</span>
                    <span className="pill t-coral">{dias} {dias === 1 ? 'dia' : 'dias'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="grid-painel">
        <section className="card faixa tom-violet">
          <div className="entre">
            <h2 className="h2">Sucesso do Cliente</h2>
            <Link href="/sucesso" className="small" style={{ fontWeight: 600 }}>Abrir painel</Link>
          </div>
          <div className="mini-stats grande">
            <span><b>{ativos}</b><small>clientes ativos</small></span>
            <span><b>{emOnboarding}</b><small>em onboarding</small></span>
            <span><b style={{ color: presencaPct !== null ? 'var(--verde)' : undefined }}>{presencaPct === null ? '—' : presencaPct + '%'}</b><small>presença no último encontro</small></span>
            <span><b>{cashbackAberto === null ? '—' : fmtMoeda(cashbackAberto)}</b><small>cashback em aberto</small></span>
          </div>
          <div className="lista-alerta">
            {proximosPorProduto.map(({ p, e }) => (
              <div key={p} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={'pill t-' + COR_PRODUTO[p]}>{p}</span>
                <span className="muted">{e ? fmtDataHora(e.data) : 'Sem data'}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="entre">
            <h2 className="h2">Time</h2>
            <span className="small muted">quem está com mais tarefas abertas</span>
          </div>
          {time.length === 0 ? (
            <div className="vazio">Ninguém com tarefa aberta.</div>
          ) : (
            <div className="pilha" style={{ gap: 14 }}>
              {time.map((p) => (
                <div key={p.user_id} className="linha" style={{ gap: 12, flexWrap: 'nowrap' }}>
                  <span className={'av t-' + corAvatar(p.user_id)} style={{ width: 30, height: 30, borderRadius: '50%', fontSize: 11 }}>{iniciais(p.nome)}</span>
                  <div className="pilha-p" style={{ flex: 1, minWidth: 0, gap: 6 }}>
                    <div className="entre" style={{ gap: 8, flexWrap: 'nowrap' }}>
                      <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</span>
                      <span className="small" style={{ color: 'var(--texto3)', whiteSpace: 'nowrap' }}>
                        {p.abertas} {p.abertas === 1 ? 'aberta' : 'abertas'}
                        {p.atrasadas ? <span style={{ color: 'var(--coral)', fontWeight: 700 }}> · {p.atrasadas} atrasada{p.atrasadas > 1 ? 's' : ''}</span> : null}
                      </span>
                    </div>
                    <div style={{ width: (p.abertas / geral.maiorCarga) * 100 + '%', minWidth: 24 }}>
                      <div className="barra-seg">
                        {p.porStatus.map((s) => (s.n ? <span key={s.nome} style={{ width: (s.n / p.abertas) * 100 + '%', background: s.bg }} /> : null))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="linha" style={{ gap: 6 }}>
            {STATUS.filter((s) => s.nome !== 'Feito').map((s) => (
              <span key={s.nome} className="pill" style={{ background: s.bg, color: s.fg }}>{s.nome}</span>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
