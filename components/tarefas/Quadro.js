'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Escolha from './Escolha';
import { CORES_GRUPO, PRIORIDADES, STATUS, atrasada, corPrioridade, corStatus, fmtPrazo } from '@/lib/tarefas';
import { corAvatar, iniciais } from '@/lib/util';
import { atualizarTarefa, criarGrupo, criarTarefa, excluirGrupo, renomearGrupo } from '@/app/actions-tarefas';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function Avatar({ pessoa, tamanho = 30 }) {
  if (!pessoa) return <span className="av-vazio" aria-hidden="true">+</span>;
  return (
    <span className={'av t-' + corAvatar(pessoa.user_id)} style={{ width: tamanho, height: tamanho, borderRadius: '50%', fontSize: 11 }} title={pessoa.nome}>
      {iniciais(pessoa.nome)}
    </span>
  );
}

function CampoNovaTarefa({ onAdicionar }) {
  const [titulo, setTitulo] = useState('');
  return (
    <form
      className="q-add"
      onSubmit={(e) => {
        e.preventDefault();
        onAdicionar(titulo, () => setTitulo(''));
      }}
    >
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="+ Adicionar tarefa" aria-label="Nova tarefa" />
      {titulo ? <button type="submit" className="btn btn-p">Adicionar</button> : null}
    </form>
  );
}

export default function Quadro({ setor, grupos, tarefas: iniciais_, equipe, hoje, visaoInicial = 'tabela' }) {
  const router = useRouter();
  const [tarefas, setTarefas] = useState(iniciais_);
  const [visao, setVisao] = useState(visaoInicial);
  const [pessoa, setPessoa] = useState('');
  const [busca, setBusca] = useState('');
  const [fechados, setFechados] = useState({});
  const [erro, setErro] = useState('');
  const [novoGrupo, setNovoGrupo] = useState(null);
  const [confirmarGrupo, setConfirmarGrupo] = useState(null);
  const [renomeando, setRenomeando] = useState(null);
  const [arrastando, setArrastando] = useState(null);
  const [alvo, setAlvo] = useState(null);
  const [mes, setMes] = useState(hoje.slice(0, 7));
  const [, iniciar] = useTransition();

  useEffect(() => setTarefas(iniciais_), [iniciais_]);

  const pessoaPorId = useMemo(() => Object.fromEntries(equipe.map((p) => [p.user_id, p])), [equipe]);

  const visiveis = tarefas.filter(
    (t) => (!pessoa || (pessoa === 'ninguem' ? !t.responsavel : t.responsavel === pessoa)) && (!busca || t.titulo.toLowerCase().includes(busca.toLowerCase()))
  );

  function avisarErro(e) {
    setErro(e?.message || 'Não foi possível salvar.');
    setTimeout(() => setErro(''), 5000);
  }

  function mudar(t, campo, valor, rotulo) {
    const antes = t[campo];
    setTarefas((lista) => lista.map((x) => (x.id === t.id ? { ...x, [campo]: valor } : x)));
    iniciar(async () => {
      try {
        await atualizarTarefa({ id: t.id, setor: setor.slug, campo, valor, rotulo });
      } catch (e) {
        setTarefas((lista) => lista.map((x) => (x.id === t.id ? { ...x, [campo]: antes } : x)));
        avisarErro(e);
      }
    });
  }

  function adicionar(grupoId, titulo, limparCampo) {
    const t = titulo.trim();
    if (!t) return;
    const temp = { id: 'novo-' + Date.now(), titulo: t, status: 'Não iniciado', prioridade: 'Média', responsavel: null, prazo: null, grupo_id: grupoId, subs_total: 0, subs_feitas: 0, atualizacoes: 0, temp: true };
    setTarefas((lista) => [...lista, temp]);
    limparCampo();
    iniciar(async () => {
      try {
        await criarTarefa({ setor: setor.slug, grupo_id: grupoId, titulo: t, responsavel: pessoa && pessoa !== 'ninguem' ? pessoa : null });
        router.refresh();
      } catch (e) {
        setTarefas((lista) => lista.filter((x) => x.id !== temp.id));
        avisarErro(e);
      }
    });
  }

  function salvarGrupo(e) {
    e.preventDefault();
    const nome = novoGrupo?.nome || '';
    const cor = novoGrupo?.cor || 'green';
    iniciar(async () => {
      try {
        await criarGrupo({ setor: setor.slug, nome, cor });
        setNovoGrupo(null);
        router.refresh();
      } catch (err) {
        avisarErro(err);
      }
    });
  }

  function apagarGrupo(g) {
    setConfirmarGrupo(null);
    iniciar(async () => {
      try {
        await excluirGrupo({ id: g.id, setor: setor.slug });
        router.refresh();
      } catch (err) {
        avisarErro(err);
      }
    });
  }

  function salvarNomeGrupo(g, nome) {
    setRenomeando(null);
    if (!nome.trim() || nome.trim() === g.nome) return;
    iniciar(async () => {
      try {
        await renomearGrupo({ id: g.id, setor: setor.slug, nome });
        router.refresh();
      } catch (err) {
        avisarErro(err);
      }
    });
  }

  const opcoesStatus = STATUS.map((s) => ({ valor: s.nome, rotulo: s.nome, estilo: { background: s.bg, color: s.fg, justifyContent: 'center' } }));
  const opcoesPrioridade = PRIORIDADES.map((p) => ({ valor: p.nome, rotulo: p.nome, estilo: { background: p.bg, color: p.fg, justifyContent: 'center' } }));
  const opcoesPessoa = [
    { valor: null, rotulo: 'Ninguém', conteudo: (<><span className="av-vazio" style={{ width: 24, height: 24 }}>–</span>Ninguém</>) },
    ...equipe.map((p) => ({ valor: p.user_id, rotulo: p.nome, conteudo: (<><Avatar pessoa={p} tamanho={24} />{p.nome}</>) })),
  ];

  function celulas(t) {
    const st = corStatus(t.status);
    const pr = corPrioridade(t.prioridade);
    const resp = pessoaPorId[t.responsavel];
    return (
      <>
        <div className="c tit">
          {t.temp ? <span style={{ color: 'var(--muted)' }}>{t.titulo}</span> : <Link href={`/tarefas/${t.id}`}>{t.titulo}</Link>}
          {t.subs_total ? <span className="q-contador" title="Subtarefas">{t.subs_feitas}/{t.subs_total}</span> : null}
        </div>
        <div className="c">
          <Escolha
            rotulo="Responsável"
            botaoClasse="cel-av"
            botao={<Avatar pessoa={resp} />}
            opcoes={opcoesPessoa}
            valor={t.responsavel || null}
            largura={220}
            onEscolher={(v, rot) => mudar(t, 'responsavel', v, rot)}
          />
        </div>
        <div className="c st">
          <Escolha
            rotulo="Status"
            botaoClasse="cel-cor"
            botaoEstilo={{ background: st.bg, color: st.fg }}
            botao={t.status}
            opcoes={opcoesStatus}
            valor={t.status}
            onEscolher={(v) => mudar(t, 'status', v, v)}
          />
        </div>
        <div className="c">
          <input
            type="date"
            aria-label="Prazo"
            className={'data-cel' + (atrasada(t, hoje) ? ' atrasada' : '')}
            value={t.prazo || ''}
            onChange={(e) => mudar(t, 'prazo', e.target.value || null, e.target.value ? fmtPrazo(e.target.value) : 'sem prazo')}
            disabled={t.temp}
          />
        </div>
        <div className="c pr">
          <Escolha
            rotulo="Prioridade"
            botaoClasse="cel-cor"
            botaoEstilo={{ background: pr.bg, color: pr.fg }}
            botao={t.prioridade}
            opcoes={opcoesPrioridade}
            valor={t.prioridade}
            onEscolher={(v) => mudar(t, 'prioridade', v, v)}
          />
        </div>
        <div className="c">
          {t.temp ? null : (
            <Link href={`/tarefas/${t.id}`} className={'pill ' + (t.atualizacoes ? 't-blue' : 't-gray')} title="Atualizações">
              {t.atualizacoes ? t.atualizacoes + ' coment.' : '+'}
            </Link>
          )}
        </div>
        <div className="c" />
      </>
    );
  }

  // ------------------------------------------------ Calendário
  const [ano, mesNum] = mes.split('-').map(Number);
  const primeiro = new Date(Date.UTC(ano, mesNum - 1, 1));
  const inicioGrade = primeiro.getUTCDay();
  const diasNoMes = new Date(Date.UTC(ano, mesNum, 0)).getUTCDate();
  const totalCelulas = Math.ceil((inicioGrade + diasNoMes) / 7) * 7;
  const dias = Array.from({ length: totalCelulas }, (_, i) => {
    const d = new Date(Date.UTC(ano, mesNum - 1, 1 + i - inicioGrade));
    const iso = d.toISOString().slice(0, 10);
    return { iso, dia: d.getUTCDate(), fora: d.getUTCMonth() !== mesNum - 1, itens: visiveis.filter((t) => t.prazo === iso) };
  });
  function trocarMes(delta) {
    const d = new Date(Date.UTC(ano, mesNum - 1 + delta, 1));
    setMes(d.toISOString().slice(0, 7));
  }

  const abertas = visiveis.filter((t) => t.status !== 'Feito').length;
  const qtdAtrasadas = visiveis.filter((t) => atrasada(t, hoje)).length;

  return (
    <>
      <div className="topo">
        <div className="pilha-p">
          <span className={'selo tom-' + (setor.cor || 'green')}><span className="sigla">{setor.sigla}</span>{setor.nome}</span>
          <h1 className="titulo">Quadro de {setor.nome}</h1>
          <span className="small" style={{ color: 'var(--texto3)' }}>
            {abertas} {abertas === 1 ? 'tarefa aberta' : 'tarefas abertas'} · {qtdAtrasadas} {qtdAtrasadas === 1 ? 'atrasada' : 'atrasadas'}
          </span>
        </div>
        <div className="linha">
          <button type="button" className="btn btn-sec" onClick={() => setNovoGrupo({ nome: '', cor: 'blue' })}>+ Novo grupo</button>
        </div>
      </div>

      {novoGrupo ? (
        <form className="card" onSubmit={salvarGrupo} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
          <div className="campo" style={{ flex: '1 1 240px' }}>
            <label htmlFor="g-nome">Nome do grupo</label>
            <input id="g-nome" autoFocus value={novoGrupo.nome} onChange={(e) => setNovoGrupo({ ...novoGrupo, nome: e.target.value })} placeholder="Ex.: Black November" />
          </div>
          <div className="campo">
            <label htmlFor="g-cor">Cor</label>
            <select id="g-cor" value={novoGrupo.cor} onChange={(e) => setNovoGrupo({ ...novoGrupo, cor: e.target.value })}>
              {Object.keys(CORES_GRUPO).map((c) => (
                <option key={c} value={c}>{{ green: 'Verde', blue: 'Azul', violet: 'Roxo', amber: 'Amarelo', coral: 'Coral', teal: 'Turquesa', gray: 'Cinza' }[c]}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn">Criar grupo</button>
          <button type="button" className="btn btn-sec" onClick={() => setNovoGrupo(null)}>Cancelar</button>
        </form>
      ) : null}

      <div className="q-ferramentas">
        <div className="segmentos" role="tablist" aria-label="Visões">
          {[['tabela', 'Tabela'], ['kanban', 'Kanban'], ['calendario', 'Calendário']].map(([id, nome]) => (
            <a key={id} href={`?visao=${id}`} role="tab" aria-selected={visao === id} className={visao === id ? 'ativo' : ''} onClick={(e) => { e.preventDefault(); setVisao(id); }}>
              {nome}
            </a>
          ))}
        </div>
        <div className="linha" style={{ gap: 8 }}>
          <input className="input" style={{ width: 200 }} placeholder="Buscar tarefa" aria-label="Buscar tarefa" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <span className="small muted">Pessoa:</span>
          {equipe.map((p) => (
            <button
              key={p.user_id}
              type="button"
              onClick={() => setPessoa(pessoa === p.user_id ? '' : p.user_id)}
              aria-pressed={pessoa === p.user_id}
              title={p.nome}
              className="cel-av"
              style={{ outline: pessoa === p.user_id ? '2px solid var(--texto)' : 'none', outlineOffset: 2 }}
            >
              <Avatar pessoa={p} tamanho={34} />
            </button>
          ))}
          {pessoa ? <button type="button" className="btn-link" onClick={() => setPessoa('')}>Limpar</button> : null}
        </div>
      </div>

      {visao === 'tabela' ? (
        <div className="pilha" style={{ gap: 26 }}>
          {grupos.length === 0 ? <div className="vazio">Nenhum grupo ainda. Crie o primeiro em "+ Novo grupo".</div> : null}
          {grupos.map((g) => {
            const itens = visiveis.filter((t) => t.grupo_id === g.id);
            const aberto = !fechados[g.id];
            const cor = CORES_GRUPO[g.cor] || CORES_GRUPO.green;
            const total = itens.length || 1;
            return (
              <section key={g.id} className="q-grupo" style={{ '--g': cor }}>
                <div className="q-grupo-topo">
                  {renomeando === g.id ? (
                    <input
                      className="input"
                      autoFocus
                      defaultValue={g.nome}
                      aria-label="Nome do grupo"
                      style={{ maxWidth: 320, color: cor, fontWeight: 700 }}
                      onBlur={(e) => salvarNomeGrupo(g, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') setRenomeando(null);
                      }}
                    />
                  ) : (
                    <button type="button" className="q-grupo-titulo" style={{ color: cor }} onClick={() => setFechados({ ...fechados, [g.id]: aberto })} aria-expanded={aberto}>
                      <span style={{ fontSize: 12, width: 14 }}>{aberto ? '▾' : '▸'}</span>
                      {g.nome}
                    </button>
                  )}
                  <span className="small muted">{itens.length} {itens.length === 1 ? 'tarefa' : 'tarefas'}</span>
                  <Escolha
                    rotulo="Opções do grupo"
                    botaoClasse="btn-link"
                    botaoEstilo={{ color: 'var(--muted)', fontSize: 18, padding: '0 6px' }}
                    botao="⋯"
                    largura={170}
                    opcoes={[
                      { valor: 'renomear', rotulo: 'Renomear' },
                      { valor: 'excluir', rotulo: 'Excluir grupo', estilo: { color: 'var(--coral)' } },
                    ]}
                    valor={null}
                    onEscolher={(v) => (v === 'renomear' ? setRenomeando(g.id) : setConfirmarGrupo(g.id))}
                  />
                  {confirmarGrupo === g.id ? (
                    <span className="linha" style={{ gap: 8 }}>
                      <span className="small" style={{ color: 'var(--coral)' }}>Excluir o grupo e as {itens.length} tarefas dele?</span>
                      <button type="button" className="btn btn-p" style={{ background: 'var(--coral)' }} onClick={() => apagarGrupo(g)}>Excluir</button>
                      <button type="button" className="btn btn-p btn-sec" onClick={() => setConfirmarGrupo(null)}>Cancelar</button>
                    </span>
                  ) : null}
                </div>
                {aberto ? (
                  <>
                    <div className="q-tabela">
                      <div className="q-cab" aria-hidden="true">
                        <span>Tarefa</span><span>Responsável</span><span>Status</span><span>Prazo</span><span>Prioridade</span><span>Atualiz.</span><span />
                      </div>
                      {itens.map((t) => (
                        <div key={t.id} className="q-linha">
                          {celulas(t)}
                        </div>
                      ))}
                      <CampoNovaTarefa onAdicionar={(titulo, limpar) => adicionar(g.id, titulo, limpar)} />
                    </div>
                    {itens.length ? (
                      <div className="q-resumo" aria-label="Resumo dos status do grupo">
                        <span /><span />
                        <span className="q-barra">
                          {STATUS.map((s) => {
                            const n = itens.filter((t) => t.status === s.nome).length;
                            return n ? <span key={s.nome} title={`${s.nome}: ${n}`} style={{ width: (n / total) * 100 + '%', background: s.bg }} /> : null;
                          })}
                        </span>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}

      {visao === 'kanban' ? (
        <div className="kanban-q">
          {STATUS.map((s) => {
            const itens = visiveis.filter((t) => t.status === s.nome);
            return (
              <section
                key={s.nome}
                className={'k-col' + (alvo === s.nome ? ' alvo' : '')}
                onDragOver={(e) => { e.preventDefault(); setAlvo(s.nome); }}
                onDragLeave={() => setAlvo(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setAlvo(null);
                  const t = tarefas.find((x) => x.id === arrastando);
                  if (t && t.status !== s.nome) mudar(t, 'status', s.nome, s.nome);
                  setArrastando(null);
                }}
                aria-label={s.nome}
              >
                <div className="k-topo" style={{ background: s.bg, color: s.fg }}>
                  <span>{s.nome}</span>
                  <span>{itens.length}</span>
                </div>
                {itens.map((t) => {
                  const pr = corPrioridade(t.prioridade);
                  return (
                    <Link
                      key={t.id}
                      href={t.temp ? '#' : `/tarefas/${t.id}`}
                      className={'k-card' + (arrastando === t.id ? ' arrastando' : '')}
                      draggable={!t.temp}
                      onDragStart={() => setArrastando(t.id)}
                      onDragEnd={() => setArrastando(null)}
                    >
                      <span style={{ fontWeight: 600, lineHeight: 1.35 }}>{t.titulo}</span>
                      <span className="entre" style={{ gap: 8 }}>
                        <Avatar pessoa={pessoaPorId[t.responsavel]} />
                        <span className="pill" style={{ background: pr.bg, color: pr.fg }}>{t.prioridade}</span>
                      </span>
                      {t.prazo ? (
                        <span className="small" style={{ color: atrasada(t, hoje) ? 'var(--coral)' : 'var(--muted)', fontWeight: atrasada(t, hoje) ? 600 : 400 }}>
                          {atrasada(t, hoje) ? 'Atrasada · ' : 'Prazo '}{fmtPrazo(t.prazo, hoje)}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </section>
            );
          })}
        </div>
      ) : null}

      {visao === 'calendario' ? (
        <section className="cal">
          <div className="entre" style={{ padding: '12px 16px', borderBottom: '1px solid var(--borda)' }}>
            <button type="button" className="btn btn-sec btn-p" onClick={() => trocarMes(-1)} aria-label="Mês anterior">‹</button>
            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{MESES[mesNum - 1]} de {ano}</span>
            <button type="button" className="btn btn-sec btn-p" onClick={() => trocarMes(1)} aria-label="Próximo mês">›</button>
          </div>
          <div className="cal-semana" aria-hidden="true">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="cal-grade">
            {dias.map((d) => (
              <div key={d.iso} className={'cal-dia' + (d.fora ? ' fora' : '')}>
                <span className={'cal-num' + (d.iso === hoje ? ' hoje' : '')} style={d.fora ? { color: '#3a4a40' } : {}}>{d.dia}</span>
                {d.itens.map((t) => {
                  const st = corStatus(t.status);
                  return (
                    <Link key={t.id} href={`/tarefas/${t.id}`} className="cal-chip" style={{ background: st.bg, color: st.fg }} title={t.titulo}>
                      {t.titulo}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
          {visiveis.some((t) => !t.prazo && t.status !== 'Feito') ? (
            <div className="pilha-p" style={{ padding: 16, borderTop: '1px solid var(--borda)' }}>
              <span className="small muted">Sem prazo</span>
              <div className="linha" style={{ gap: 6 }}>
                {visiveis.filter((t) => !t.prazo && t.status !== 'Feito').map((t) => (
                  <Link key={t.id} href={`/tarefas/${t.id}`} className="pill t-gray">{t.titulo}</Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {erro ? <div className="aviso t-coral toast" role="alert">{erro}</div> : null}
    </>
  );
}
