import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { resumoEncontros } from '@/lib/encontros';
import { ETAPAS } from '@/lib/onboarding';
import { COR_PRODUTO, PRODUTOS, corAvatar, fmtDataHora, iniciais } from '@/lib/util';
import Icone from '@/components/Icone';

export default async function Painel({ searchParams }) {
  const filtro = searchParams?.ultimo || 'todos';
  const supabase = createClient();
  const [{ data: clientes, error }, { count: semAcessoTotal }, { data: encontros }, { data: presencaCliente }, { data: porEncontro }] = await Promise.all([
    supabase.from('clientes').select('*').neq('status', 'encerrado').order('criado_em', { ascending: false }),
    supabase.from('membros').select('id', { count: 'exact', head: true }).eq('acesso_liberado', false),
    supabase.from('encontros').select('*').order('data'),
    supabase.from('presenca_cliente').select('encontro_id, cliente_id, presente'),
    supabase.from('presenca_encontro').select('encontro_id, presentes, faltas'),
  ]);
  if (error) throw new Error(error.message);

  const agora = new Date();
  const lista = (clientes || []).map((c) => ({ c, r: resumoEncontros(c, encontros || [], presencaCliente || [], agora) }));

  const filtrada = lista.filter(({ r }) => {
    if (filtro === 'presentes') return r.ultimoTipo === 'ok';
    if (filtro === 'faltaram') return r.ultimoTipo === 'falta';
    return true;
  });

  // KPIs
  const ativos = lista.length;
  const emOnboarding = lista.filter(({ c }) => c.status === 'onboarding').length;
  const futuros = (encontros || []).filter((e) => new Date(e.data) > agora);
  const proximo = futuros[0];
  const resumoPorEncontro = Object.fromEntries((porEncontro || []).map((p) => [p.encontro_id, p]));
  const passadosComChamada = (encontros || []).filter((e) => new Date(e.data) <= agora && resumoPorEncontro[e.id]);
  const ultimoEnc = passadosComChamada[passadosComChamada.length - 1];
  let presencaPct = null;
  if (ultimoEnc) {
    const { presentes, faltas } = resumoPorEncontro[ultimoEnc.id];
    const total = Number(presentes) + Number(faltas);
    presencaPct = total ? Math.round((Number(presentes) / total) * 100) : null;
  }

  // Alertas
  const alertas = [];
  lista.forEach(({ c, r }) => {
    if (r.faltasSeguidas >= 2) alertas.push({ tag: 'Presença', cor: 'amber', texto: `${c.nome} (${c.empresa}) faltou ${r.faltasSeguidas} encontros seguidos`, id: c.id });
    if (c.status === 'ativo' && r.contratados > 0 && r.saldo === 0) alertas.push({ tag: 'Renovação', cor: 'green', texto: `${c.nome} não tem mais encontros no saldo`, id: c.id });
    if (c.status === 'onboarding' && !c.responsavel) alertas.push({ tag: 'Onboarding', cor: 'violet', texto: `${c.nome}: onboarding sem responsável`, id: c.id });
  });
  const semAcesso = semAcessoTotal || 0;
  if (semAcesso) alertas.push({ tag: 'Acesso', cor: 'blue', texto: `${semAcesso} pessoa(s) do time dos clientes com acesso pendente` });

  const proximosPorProduto = PRODUTOS.map((p) => ({ p, e: futuros.find((e) => e.produto === p) }));

  return (
    <>
      <div className="topo anim">
        <div>
          <span className="eyebrow">Visão do time · todos os clientes</span>
          <h1 className="titulo">Painel geral</h1>
        </div>
        <div className="linha">
          <Link href="/encontros" className="btn btn-sec">Fazer chamada</Link>
          <Link href="/clientes/novo" className="btn">+ Novo cliente</Link>
        </div>
      </div>

      <div className="grid-kpi">
        <div className="kpi anim anim-1">
          <span className="icone t-blue"><Icone nome="pessoas" tamanho={20} /></span>
          <span className="muted">Clientes ativos</span>
          <span className="valor">{ativos}</span>
        </div>
        <div className="kpi anim anim-2">
          <span className="icone t-violet"><Icone nome="check" tamanho={20} /></span>
          <span className="muted">Em onboarding</span>
          <span className="valor">{emOnboarding}</span>
        </div>
        <div className="kpi anim anim-3">
          <span className="icone t-amber"><Icone nome="calendario" tamanho={20} /></span>
          <span className="muted">Próximo encontro</span>
          <span className="valor" style={{ fontSize: proximo ? 24 : 34 }}>{proximo ? fmtDataHora(proximo.data) : '—'}</span>
          <span className="small muted">{proximo ? `${proximo.produto} · ${proximo.titulo}` : 'Nenhum agendado'}</span>
        </div>
        <div className="kpi anim anim-4">
          <span className="icone t-green"><Icone nome="presenca" tamanho={20} /></span>
          <span className="muted">Presença no último encontro</span>
          <span className="valor" style={{ color: 'var(--verde)' }}>{presencaPct === null ? '—' : presencaPct + '%'}</span>
          {presencaPct !== null ? (
            <div className="barra"><span className="s-green" style={{ width: presencaPct + '%' }} /></div>
          ) : (
            <span className="small muted">Nenhuma chamada feita ainda</span>
          )}
        </div>
      </div>

      <section className="card anim anim-2">
        <div className="entre">
          <h2 className="h2">Clientes</h2>
          <div className="segmentos" role="group" aria-label="Filtrar pelo último encontro">
            <Link href="/" className={filtro === 'todos' ? 'ativo' : ''}>Todos</Link>
            <Link href="/?ultimo=presentes" className={filtro === 'presentes' ? 'ativo' : ''}>Presentes</Link>
            <Link href="/?ultimo=faltaram" className={filtro === 'faltaram' ? 'ativo' : ''}>Faltaram</Link>
          </div>
        </div>
        {filtrada.length === 0 ? (
          <div className="vazio">
            {lista.length === 0 ? (
              <>Nenhum cliente cadastrado ainda. <Link href="/clientes/novo">Cadastrar o primeiro</Link></>
            ) : (
              'Nenhum cliente neste filtro.'
            )}
          </div>
        ) : (
          <div className="tabela-box">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Produto</th>
                  <th>Etapa</th>
                  <th>Responsável</th>
                  <th>Encontros</th>
                  <th>Último encontro</th>
                </tr>
              </thead>
              <tbody>
                {filtrada.map(({ c, r }) => {
                  const pct = r.contratados ? Math.min(100, Math.round((r.usados / r.contratados) * 100)) : 0;
                  const etapa = c.status === 'onboarding' ? ETAPAS[c.etapa_onboarding]?.nome || 'Onboarding' : 'Encontros';
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/clientes/${c.id}`} className="linha" style={{ color: 'var(--texto)', flexWrap: 'nowrap' }}>
                          <span className={'av t-' + corAvatar(c.id)}>{iniciais(c.nome)}</span>
                          <span className="pilha-p" style={{ gap: 2 }}>
                            <span style={{ fontWeight: 600 }}>{c.nome}</span>
                            <span className="small muted">{c.empresa}</span>
                          </span>
                        </Link>
                      </td>
                      <td><span className={'pill t-' + COR_PRODUTO[c.produto]}>{c.produto}</span></td>
                      <td style={{ color: 'var(--texto2)' }}>{etapa}</td>
                      <td className="muted">{c.responsavel || '—'}</td>
                      <td style={{ minWidth: 130 }}>
                        <div className="pilha-p">
                          <span style={{ fontSize: 13 }}>
                            {r.usados} de {r.contratados} · saldo {r.saldo}
                          </span>
                          <div className="barra" style={{ height: 4 }}>
                            <span className={'s-' + COR_PRODUTO[c.produto]} style={{ width: pct + '%' }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={'pill ' + (r.ultimoTipo === 'ok' ? 't-green' : r.ultimoTipo === 'falta' ? 't-amber' : 't-gray')}>{r.ultimo}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid-lado anim anim-3">
        <section className="card">
          <h2 className="h2">Atenção do time</h2>
          <div className="lista-alerta">
            {alertas.length === 0 ? (
              <div>Nada pendente por aqui.</div>
            ) : (
              alertas.map((a, i) => (
                <div key={i}>
                  <span className={'tag t-' + a.cor}>{a.tag}</span>
                  {a.id ? <Link href={`/clientes/${a.id}`} style={{ color: 'var(--texto2)' }}>{a.texto}</Link> : <span>{a.texto}</span>}
                </div>
              ))
            )}
          </div>
        </section>
        <section className="card">
          <h2 className="h2">Próximos encontros</h2>
          <div className="lista-alerta">
            {proximosPorProduto.map(({ p, e }) => (
              <div key={p} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={'pill t-' + COR_PRODUTO[p]} style={{ fontSize: 13 }}>{p}</span>
                {e ? <Link href={`/encontros/${e.id}`} className="muted">{fmtDataHora(e.data)}</Link> : <span className="muted">Sem data</span>}
              </div>
            ))}
          </div>
          <Link href="/encontros" className="small" style={{ fontWeight: 600 }}>Ver todos os encontros</Link>
        </section>
      </div>
    </>
  );
}
