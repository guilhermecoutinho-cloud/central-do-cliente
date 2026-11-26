import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MOTIVOS, fmtMoeda, nivelDe } from '@/lib/cashback';
import { FAIXAS_FATURAMENTO, STATUS_INDICACAO, corIndicacao, idade } from '@/lib/aluno';
import { PRODUTOS, fmtData } from '@/lib/util';
import { cashbackDaIndicacao, criarIndicacao, mudarIndicacao, removerIndicacao, salvarFicha } from '@/app/actions-ficha';
import FotoAluno from '@/components/FotoAluno';
import CalculadoraCashback from '@/components/CalculadoraCashback';
import BotaoConfirmar from '@/components/BotaoConfirmar';

export const metadata = { title: 'Ficha do aluno · Central da Empresa' };

const STATUS_CLIENTE = { onboarding: ['Onboarding', 'amber'], ativo: ['Ativo', 'green'], encerrado: ['Encerrado', 'gray'] };

// Linha "rótulo: valor" da ficha (some se não tiver valor)
function Dado({ rotulo, children, largo }) {
  if (children === null || children === undefined || children === '' || children === false) return null;
  return (
    <div className={'ficha-dado' + (largo ? ' largo' : '')}>
      <span className="small muted">{rotulo}</span>
      <span>{children}</span>
    </div>
  );
}

const soNumeros = (s) => String(s || '').replace(/\D/g, '');
function linkWhats(cel) {
  const n = soNumeros(cel);
  if (n.length < 10) return null;
  return 'https://wa.me/' + (n.length <= 11 ? '55' + n : n);
}

export default async function FichaAluno({ params, searchParams }) {
  const supabase = createClient();
  const { data: c } = await supabase.from('clientes').select('*').eq('id', params.id).maybeSingle();
  if (!c) notFound();
  const temFicha = 'foto_url' in c;
  const editando = searchParams?.editar === '1' && temFicha;

  const [{ data: membros }, { data: saldo }, ind, { data: vieramPorEle }, { data: indicador }, { data: equipe }, { data: eventos }, { data: todos }] = await Promise.all([
    supabase.from('membros').select('id, nome, cargo, telefone, email, papel').eq('cliente_id', c.id).order('criado_em'),
    supabase.from('cashback_saldos').select('*').eq('cliente_id', c.id).maybeSingle(),
    supabase.from('indicacoes').select('*').eq('indicador_id', c.id).order('criado_em', { ascending: false }),
    temFicha ? supabase.from('clientes').select('id, nome, empresa, produto').eq('indicado_por_id', c.id) : Promise.resolve({ data: [] }),
    c.indicado_por_id ? supabase.from('clientes').select('id, nome, empresa').eq('id', c.indicado_por_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from('equipe').select('nome').order('nome'),
    supabase.from('eventos').select('nome, data_inicio').order('data_inicio', { ascending: false }).limit(80),
    editando ? supabase.from('clientes').select('id, nome, empresa').neq('id', c.id).order('nome') : Promise.resolve({ data: [] }),
  ]);
  const indicacoes = ind.data || [];
  const semIndicacoes = Boolean(ind.error);
  // Quem virou aluno pela indicação dele e não está na lista de indicações
  const ligadas = new Set(indicacoes.map((i) => i.cliente_id).filter(Boolean));
  const extras = (vieramPorEle || []).filter((x) => !ligadas.has(x.id));

  const s = saldo || { saldo: 0, total_ganho: 0, total_resgatado: 0 };
  const nivel = nivelDe(s.total_ganho);
  const fechadas = indicacoes.filter((i) => i.status === 'Fechou').length + extras.length;
  const fechadasSemCashback = indicacoes.filter((i) => i.status === 'Fechou' && !i.cashback_mov_id).length;
  const valorIndicacao = MOTIVOS.find((m) => m.categoria === 'Indicação')?.valor || 0;
  const [stNome, stCor] = STATUS_CLIENTE[c.status] || [c.status, 'gray'];
  const anos = idade(c.data_nascimento);
  const deOnde = [c.cidade, c.estado].filter(Boolean).join(' / ');
  const whats = linkWhats(c.celular);
  const nomesEquipe = (equipe || []).map((p) => p.nome);
  const nomesEventos = [...new Set((eventos || []).map((e) => e.nome))];

  return (
    <>
      <div className="entre" style={{ flexWrap: 'wrap', gap: 10 }}>
        <Link href="/treinamentos" className="small muted">‹ Área do aluno</Link>
        <span className="linha" style={{ gap: 14 }}>
          <Link href={`/clientes/${c.id}`} className="small">Abrir cliente completo</Link>
          {temFicha && !editando ? <Link href={`/alunos/${c.id}?editar=1`} className="btn btn-sec" style={{ padding: '8px 14px' }}>Editar ficha</Link> : null}
        </span>
      </div>

      {!temFicha ? <div className="aviso t-amber">Para usar a ficha completa (foto, origem, faturamento e indicações), rode o arquivo supabase/ficha-aluno.sql no SQL Editor do Supabase.</div> : null}
      {searchParams?.salvo ? <div className="aviso t-green">Ficha salva.</div> : null}

      {/* Cabeçalho */}
      <section className="card ficha-topo">
        {temFicha ? <FotoAluno id={c.id} url={c.foto_url} nome={c.nome} /> : null}
        <div className="pilha-p" style={{ gap: 6, minWidth: 0, flex: 1 }}>
          <h1 className="titulo" style={{ margin: 0 }}>{c.nome}</h1>
          <span style={{ color: 'var(--texto2)', fontSize: 16 }}>{c.empresa}{c.segmento ? ' · ' + c.segmento : ''}</span>
          <span className="linha" style={{ gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            <span className="pill t-green">{c.produto}</span>
            <span className={'pill t-' + stCor}>{stNome}</span>
            {deOnde ? <span className="pill t-gray">{deOnde}</span> : null}
            {c.faixa_faturamento ? <span className="pill t-gray">{c.faixa_faturamento}</span> : null}
            {c.data_inicio ? <span className="small muted">Aluno desde {fmtData(c.data_inicio)}</span> : null}
          </span>
        </div>
        <div className="ficha-topo-cb">
          <span className="small muted">Cashback disponível</span>
          <span className="valor" style={{ color: 'var(--verde)' }}>{fmtMoeda(s.saldo)}</span>
          <span className={'pill t-' + nivel.atual.cor}>Nível {nivel.atual.nome}</span>
        </div>
      </section>

      {editando ? (
        <form action={salvarFicha} className="card pilha">
          <input type="hidden" name="id" value={c.id} />
          <div className="entre"><h2 className="h2">Editar ficha</h2><Link href={`/alunos/${c.id}`} className="btn-link">Cancelar</Link></div>

          <span className="ficha-sub">Cadastro</span>
          <div className="form-grid">
            <div className="campo"><label htmlFor="f-nome">Nome completo *</label><input id="f-nome" name="nome" required defaultValue={c.nome} /></div>
            <div className="campo"><label htmlFor="f-nasc">Data de nascimento</label><input id="f-nasc" name="data_nascimento" type="date" defaultValue={c.data_nascimento || ''} style={{ colorScheme: 'dark' }} /></div>
            <div className="campo"><label htmlFor="f-cpf">CPF</label><input id="f-cpf" name="cpf" defaultValue={c.cpf || ''} /></div>
            <div className="campo"><label htmlFor="f-rg">RG</label><input id="f-rg" name="rg" defaultValue={c.rg || ''} /></div>
            <div className="campo"><label htmlFor="f-email">E-mail</label><input id="f-email" name="email" type="email" defaultValue={c.email || ''} /></div>
            <div className="campo"><label htmlFor="f-cel">Celular</label><input id="f-cel" name="celular" defaultValue={c.celular || ''} /></div>
          </div>

          <span className="ficha-sub">Endereço</span>
          <div className="form-grid">
            <div className="campo inteiro"><label htmlFor="f-end">Endereço</label><input id="f-end" name="endereco" defaultValue={c.endereco || ''} /></div>
            <div className="campo"><label htmlFor="f-bairro">Bairro</label><input id="f-bairro" name="bairro" defaultValue={c.bairro || ''} /></div>
            <div className="campo"><label htmlFor="f-cid">Cidade</label><input id="f-cid" name="cidade" defaultValue={c.cidade || ''} /></div>
            <div className="campo"><label htmlFor="f-uf">Estado</label><input id="f-uf" name="estado" defaultValue={c.estado || ''} /></div>
            <div className="campo"><label htmlFor="f-cep">CEP</label><input id="f-cep" name="cep" defaultValue={c.cep || ''} /></div>
          </div>

          <span className="ficha-sub">Empresa</span>
          <div className="form-grid">
            <div className="campo"><label htmlFor="f-emp">Empresa *</label><input id="f-emp" name="empresa" required defaultValue={c.empresa} /></div>
            <div className="campo"><label htmlFor="f-cnpj">CNPJ</label><input id="f-cnpj" name="cnpj" defaultValue={c.cnpj || ''} /></div>
            <div className="campo"><label htmlFor="f-seg">Segmento</label><input id="f-seg" name="segmento" defaultValue={c.segmento || ''} /></div>
            <div className="campo">
              <label htmlFor="f-fat">Faixa de faturamento</label>
              <select id="f-fat" name="faixa_faturamento" defaultValue={c.faixa_faturamento || ''}>
                <option value="">Não informado</option>
                {FAIXAS_FATURAMENTO.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="campo"><label htmlFor="f-site">Site</label><input id="f-site" name="site" defaultValue={c.site || ''} /></div>
            <div className="campo"><label htmlFor="f-insta">Instagram</label><input id="f-insta" name="instagram" defaultValue={c.instagram || ''} /></div>
          </div>

          <span className="ficha-sub">Como chegou</span>
          <div className="form-grid">
            <div className="campo">
              <label htmlFor="f-ev">Evento em que veio</label>
              <input id="f-ev" name="evento_origem" list="lista-eventos" defaultValue={c.evento_origem || ''} placeholder="Ex.: GC – Gestão do Crescimento" />
              <datalist id="lista-eventos">{nomesEventos.map((n) => <option key={n} value={n} />)}</datalist>
            </div>
            <div className="campo">
              <label htmlFor="f-cons">Consultor</label>
              <input id="f-cons" name="consultor" list="lista-equipe" defaultValue={c.consultor || ''} />
              <datalist id="lista-equipe">{nomesEquipe.map((n) => <option key={n} value={n} />)}</datalist>
            </div>
            <div className="campo"><label htmlFor="f-closer">Closer (quem fechou a venda)</label><input id="f-closer" name="closer" list="lista-equipe" defaultValue={c.closer || ''} /></div>
            <div className="campo">
              <label htmlFor="f-indpor">Quem indicou (aluno)</label>
              <select id="f-indpor" name="indicado_por_id" defaultValue={c.indicado_por_id || ''}>
                <option value="">Ninguém / não é aluno</option>
                {(todos || []).map((x) => <option key={x.id} value={x.id}>{x.nome} · {x.empresa}</option>)}
              </select>
            </div>
            <div className="campo"><label htmlFor="f-indnome">Ou quem indicou (fora da base)</label><input id="f-indnome" name="indicado_por_nome" defaultValue={c.indicado_por_nome || ''} placeholder="Nome de quem indicou" /></div>
          </div>
          <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>Salvar ficha</button>
        </form>
      ) : (
        <div className="ficha-grade">
          <div className="pilha">
            <section className="card">
              <h2 className="h2">Cadastro</h2>
              <div className="ficha-dados">
                <Dado rotulo="Nome completo">{c.nome}</Dado>
                <Dado rotulo="Nascimento">{c.data_nascimento ? fmtData(c.data_nascimento) + (anos !== null ? ` (${anos} anos)` : '') : null}</Dado>
                <Dado rotulo="CPF">{c.cpf}</Dado>
                <Dado rotulo="RG">{c.rg}</Dado>
                <Dado rotulo="E-mail">{c.email ? <a href={'mailto:' + c.email}>{c.email}</a> : null}</Dado>
                <Dado rotulo="Celular">{c.celular ? (whats ? <a href={whats} target="_blank" rel="noreferrer">{c.celular}</a> : c.celular) : null}</Dado>
                <Dado rotulo="Endereço" largo>{[c.endereco, c.bairro].filter(Boolean).join(' · ') || null}</Dado>
                <Dado rotulo="De onde é">{deOnde || null}</Dado>
                <Dado rotulo="CEP">{c.cep}</Dado>
              </div>
              {!c.cpf && !c.email && !c.celular && !c.endereco ? <span className="small muted">Cadastro ainda incompleto. Use “Editar ficha” para completar.</span> : null}
            </section>

            <section className="card">
              <h2 className="h2">Empresa</h2>
              <div className="ficha-dados">
                <Dado rotulo="Empresa">{c.empresa}</Dado>
                <Dado rotulo="CNPJ">{c.cnpj}</Dado>
                <Dado rotulo="Segmento">{c.segmento}</Dado>
                <Dado rotulo="Faixa de faturamento">{c.faixa_faturamento || (temFicha ? 'Não informado' : null)}</Dado>
                <Dado rotulo="Site">{c.site ? <a href={/^https?:/.test(c.site) ? c.site : 'https://' + c.site} target="_blank" rel="noreferrer">{c.site}</a> : null}</Dado>
                <Dado rotulo="Instagram">{c.instagram}</Dado>
              </div>
            </section>

            <section className="card">
              <h2 className="h2">Como chegou</h2>
              <div className="ficha-dados">
                <Dado rotulo="Evento em que veio">{c.evento_origem || (temFicha ? 'Não informado' : null)}</Dado>
                <Dado rotulo="Consultor">{c.consultor || (temFicha ? 'Não informado' : null)}</Dado>
                <Dado rotulo="Closer">{c.closer}</Dado>
                <Dado rotulo="Responsável no Sucesso">{c.responsavel}</Dado>
                <Dado rotulo="Quem indicou">
                  {indicador ? <Link href={`/alunos/${indicador.id}`}>{indicador.nome} · {indicador.empresa}</Link> : c.indicado_por_nome || (temFicha ? 'Ninguém' : null)}
                </Dado>
              </div>
            </section>

            {(membros || []).length ? (
              <section className="card">
                <h2 className="h2">Time do aluno ({membros.length})</h2>
                <div className="lista-alerta">
                  {membros.map((m) => (
                    <div key={m.id} style={{ alignItems: 'center' }}>
                      <span className="pilha-p" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 600 }}>{m.nome}</span>
                        <span className="small muted">{[m.cargo, m.papel, m.telefone, m.email].filter(Boolean).join(' · ')}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div className="pilha">
            <section className="card">
              <div className="entre"><h2 className="h2">Cashback</h2><Link href={`/clientes/${c.id}?aba=cashback`} className="small">Lançar ou resgatar</Link></div>
              <div className="ficha-cb">
                <span className="pilha-p" style={{ gap: 2 }}><span className="small muted">Saldo</span><b style={{ color: 'var(--verde)' }}>{fmtMoeda(s.saldo)}</b></span>
                <span className="pilha-p" style={{ gap: 2 }}><span className="small muted">Total ganho</span><b>{fmtMoeda(s.total_ganho)}</b></span>
                <span className="pilha-p" style={{ gap: 2 }}><span className="small muted">Já resgatou</span><b>{fmtMoeda(s.total_resgatado)}</b></span>
              </div>
              {nivel.proximo ? (
                <div className="pilha-p" style={{ gap: 6 }}>
                  <span className="small muted">Faltam {fmtMoeda(nivel.falta)} para o nível {nivel.proximo.nome}</span>
                  <span className="barra"><span style={{ width: nivel.pct + '%', background: 'var(--verde)' }} /></span>
                </div>
              ) : null}
              <span className="ficha-sub" style={{ marginTop: 6 }}>Calculadora</span>
              <CalculadoraCashback saldo={Number(s.saldo)} totalGanho={Number(s.total_ganho)} fechadasSemCashback={fechadasSemCashback} valorPorIndicacao={valorIndicacao} />
            </section>

            <section className="card">
              <div className="entre">
                <h2 className="h2">Indicações dele ({indicacoes.length + extras.length})</h2>
                <span className="small muted">{fechadas} {fechadas === 1 ? 'fechou' : 'fecharam'}</span>
              </div>
              {semIndicacoes ? (
                <span className="small muted">Rode o supabase/ficha-aluno.sql para registrar as indicações.</span>
              ) : (
                <>
                  {indicacoes.length || extras.length ? (
                    <div className="lista-alerta">
                      {extras.map((x) => (
                        <div key={'c' + x.id} style={{ alignItems: 'center' }}>
                          <span className="pilha-p" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                            <Link href={`/alunos/${x.id}`} style={{ fontWeight: 600, color: 'var(--texto)' }}>{x.nome}</Link>
                            <span className="small muted">{x.empresa} · virou aluno do {x.produto}</span>
                          </span>
                          <span className="pill t-green">Fechou</span>
                        </div>
                      ))}
                      {indicacoes.map((i) => (
                        <div key={i.id} className="indicacao">
                          <span className="pilha-p" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                            <span style={{ fontWeight: 600 }}>{i.nome}</span>
                            <span className="small muted">
                              {[i.empresa, i.produto, i.telefone, i.valor_venda ? 'venda ' + fmtMoeda(i.valor_venda) : null, fmtData(i.criado_em)].filter(Boolean).join(' · ')}
                            </span>
                            {i.cashback_mov_id ? <span className="small" style={{ color: 'var(--verde)' }}>Cashback lançado</span> : null}
                          </span>
                          <span className="indicacao-acoes">
                          <form action={mudarIndicacao} className="linha" style={{ gap: 6 }}>
                            <input type="hidden" name="id" value={i.id} />
                            <input type="hidden" name="indicador_id" value={c.id} />
                            <select name="status" defaultValue={i.status} className={'pill-select t-' + corIndicacao(i.status)} aria-label="Situação da indicação">
                              {STATUS_INDICACAO.map((x) => <option key={x.nome}>{x.nome}</option>)}
                            </select>
                            <button type="submit" className="btn-link">Salvar</button>
                          </form>
                          {i.status === 'Fechou' && !i.cashback_mov_id ? (
                            <form action={cashbackDaIndicacao} className="linha" style={{ gap: 6 }}>
                              <input type="hidden" name="id" value={i.id} />
                              <input type="hidden" name="indicador_id" value={c.id} />
                              <input name="valor" defaultValue={valorIndicacao} inputMode="decimal" className="input" style={{ width: 90, padding: '6px 8px' }} aria-label="Valor do cashback" />
                              <button type="submit" className="btn" style={{ padding: '6px 10px' }}>Dar cashback</button>
                            </form>
                          ) : null}
                          <form action={removerIndicacao}>
                            <input type="hidden" name="id" value={i.id} />
                            <input type="hidden" name="indicador_id" value={c.id} />
                            <BotaoConfirmar pergunta={`Apagar a indicação de ${i.nome}?`} className="btn-link" style={{ color: 'var(--muted2)' }}>Apagar</BotaoConfirmar>
                          </form>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="small muted">Nenhuma indicação registrada ainda.</span>
                  )}
                  <details className="ficha-nova-ind">
                    <summary className="small">+ Registrar indicação</summary>
                    <form action={criarIndicacao} className="pilha-p" style={{ gap: 10, marginTop: 10 }}>
                      <input type="hidden" name="indicador_id" value={c.id} />
                      <div className="form-grid">
                        <div className="campo"><label htmlFor="i-nome">Nome *</label><input id="i-nome" name="nome" required /></div>
                        <div className="campo"><label htmlFor="i-emp">Empresa</label><input id="i-emp" name="empresa" /></div>
                        <div className="campo"><label htmlFor="i-tel">Telefone</label><input id="i-tel" name="telefone" /></div>
                        <div className="campo">
                          <label htmlFor="i-prod">Produto de interesse</label>
                          <select id="i-prod" name="produto" defaultValue=""><option value="">—</option>{PRODUTOS.map((p) => <option key={p}>{p}</option>)}</select>
                        </div>
                      </div>
                      <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>Registrar</button>
                    </form>
                  </details>
                </>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
