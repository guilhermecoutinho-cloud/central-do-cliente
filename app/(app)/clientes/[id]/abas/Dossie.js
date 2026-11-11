import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { origem } from '@/lib/origem';
import { CAMPOS_FORMULARIO } from '@/lib/formulario';
import { COR_SETOR, PRODUTOS, SETORES, corAvatar, fmtData, fmtDataHora, fmtTamanho, iniciais } from '@/lib/util';
import {
  adicionarAcesso,
  alternarAcesso,
  atualizarCliente,
  excluirCliente,
  removerAcesso,
  removerArquivo,
} from '@/app/actions';
import UploadArquivo from '@/components/UploadArquivo';
import CopiarTexto from '@/components/CopiarTexto';

const SECOES = [
  ['cadastro', 'Cadastro', 'green'],
  ['contatos', 'Contatos', 'blue'],
  ['acessos', 'Acessos', 'violet'],
  ['formularios', 'Formulários e respostas', 'amber'],
  ['arquivos', 'Arquivos', 'coral'],
];

export default async function AbaDossie({ c, membros, searchParams }) {
  const sec = SECOES.some(([k]) => k === searchParams.sec) ? searchParams.sec : 'cadastro';
  const supabase = createClient();

  const [{ data: acessos }, { data: arquivos }, { data: respostas }] = await Promise.all([
    supabase.from('acessos').select('*').eq('cliente_id', c.id).order('criado_em'),
    supabase.from('arquivos').select('*').eq('cliente_id', c.id).order('criado_em', { ascending: false }),
    supabase.from('assessment_respostas').select('*').eq('cliente_id', c.id).order('criado_em', { ascending: false }),
  ]);

  let links = {};
  if (sec === 'arquivos' && arquivos && arquivos.length) {
    const { data } = await supabase.storage.from('arquivos').createSignedUrls(arquivos.map((a) => a.caminho), 3600);
    (data || []).forEach((d) => {
      if (d.path && d.signedUrl) links[d.path] = d.signedUrl;
    });
  }

  const resumo = {
    cadastro: c.cnpj && c.segmento ? 'Completo' : 'Incompleto',
    contatos: `${membros.length} ${membros.length === 1 ? 'pessoa' : 'pessoas'}`,
    acessos: `${(acessos || []).filter((a) => a.liberado).length} de ${(acessos || []).length} liberados`,
    formularios: `${(c.formulario ? 1 : 0) + (respostas || []).length} respostas`,
    arquivos: `${(arquivos || []).length} arquivos`,
  };

  return (
    <div className="colunas">
      <div className="col-principal">
        <div className="segmentos" role="tablist" aria-label="Seções do dossiê" style={{ alignSelf: 'flex-start' }}>
          {SECOES.map(([k, nome]) => (
            <Link key={k} href={`/clientes/${c.id}?aba=dossie&sec=${k}`} className={sec === k ? 'ativo' : ''} role="tab" aria-selected={sec === k}>
              {nome}
            </Link>
          ))}
        </div>

        {sec === 'cadastro' && (
          <form action={atualizarCliente} className="card">
            <h2 className="h2">Cadastro do cliente</h2>
            <input type="hidden" name="id" value={c.id} />
            <div className="form-grid">
              <div className="campo"><label htmlFor="d-nome">Contato principal</label><input id="d-nome" name="nome" defaultValue={c.nome} required /></div>
              <div className="campo"><label htmlFor="d-empresa">Empresa (razão social)</label><input id="d-empresa" name="empresa" defaultValue={c.empresa} required /></div>
              <div className="campo"><label htmlFor="d-cnpj">CNPJ</label><input id="d-cnpj" name="cnpj" defaultValue={c.cnpj || ''} /></div>
              <div className="campo"><label htmlFor="d-seg">Segmento</label><input id="d-seg" name="segmento" defaultValue={c.segmento || ''} /></div>
              <div className="campo"><label htmlFor="d-cid">Cidade</label><input id="d-cid" name="cidade" defaultValue={c.cidade || ''} /></div>
              <div className="campo"><label htmlFor="d-site">Site</label><input id="d-site" name="site" defaultValue={c.site || ''} /></div>
              <div className="campo"><label htmlFor="d-insta">Instagram</label><input id="d-insta" name="instagram" defaultValue={c.instagram || ''} /></div>
              <div className="campo">
                <label htmlFor="d-prod">Produto</label>
                <select id="d-prod" name="produto" defaultValue={c.produto}>
                  {PRODUTOS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="campo"><label htmlFor="d-ini">Data de início</label><input id="d-ini" name="data_inicio" type="date" defaultValue={c.data_inicio || ''} /></div>
              <div className="campo"><label htmlFor="d-enc">Encontros contratados</label><input id="d-enc" name="encontros_contratados" type="number" min="0" defaultValue={c.encontros_contratados} /></div>
              <div className="campo"><label htmlFor="d-resp">Responsável CAUP</label><input id="d-resp" name="responsavel" defaultValue={c.responsavel || ''} /></div>
              <div className="campo"><label htmlFor="d-sub">Substituto</label><input id="d-sub" name="substituto" defaultValue={c.substituto || ''} /></div>
              <div className="campo"><label htmlFor="d-closer">Quem vendeu</label><input id="d-closer" name="closer" defaultValue={c.closer || ''} /></div>
              <div className="campo inteiro"><label htmlFor="d-cond">Condições</label><input id="d-cond" name="condicoes" defaultValue={c.condicoes || ''} /></div>
              <div className="campo inteiro"><label htmlFor="d-obs">Observações</label><textarea id="d-obs" name="observacoes" defaultValue={c.observacoes || ''} /></div>
            </div>
            <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>Salvar cadastro</button>
          </form>
        )}

        {sec === 'cadastro' && (
          <form action={excluirCliente} className="card" style={{ borderColor: 'rgba(240,134,110,.3)' }}>
            <input type="hidden" name="id" value={c.id} />
            <span className="muted">Excluir apaga o cliente, o time, as presenças, os acompanhamentos e os registros de arquivos. Não tem como desfazer.</span>
            <div className="linha">
              <input name="confirmacao" className="input" placeholder='Digite EXCLUIR para confirmar' aria-label="Confirmação" style={{ maxWidth: 260 }} />
              <button type="submit" className="btn-perigo">Excluir cliente</button>
            </div>
          </form>
        )}

        {sec === 'contatos' && (
          <section className="card">
            <div className="entre">
              <h2 className="h2">Contatos</h2>
              <Link href={`/clientes/${c.id}?aba=time`} className="small" style={{ fontWeight: 600 }}>Editar no Time</Link>
            </div>
            {membros.length === 0 ? (
              <div className="vazio">Nenhum contato cadastrado.</div>
            ) : (
              <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                {membros.map((m) => (
                  <div key={m.id} className="card-2 pilha">
                    <div className="linha" style={{ flexWrap: 'nowrap' }}>
                      <span className={'av t-' + corAvatar(m.id)}>{iniciais(m.nome)}</span>
                      <span className="pilha-p" style={{ gap: 2 }}>
                        <span style={{ fontWeight: 600 }}>{m.nome}</span>
                        <span className="small muted">{m.cargo || 'Sem cargo'}</span>
                      </span>
                    </div>
                    {m.papel ? <span className={'pill t-' + corAvatar(m.papel)} style={{ alignSelf: 'flex-start' }}>{m.papel}</span> : null}
                    <div className="pilha-p small" style={{ color: 'var(--texto3)', wordBreak: 'break-all' }}>
                      <span>{m.telefone || 'Sem telefone'}</span>
                      <span>{m.email || 'Sem e-mail'}</span>
                      {m.email_celular ? <span>{m.email_celular}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {sec === 'acessos' && (
          <>
            <section className="card">
              <div className="pilha-p">
                <h2 className="h2">Acessos</h2>
                <span className="muted">Onde o cliente e o time dele têm acesso. Clique no status para alternar.</span>
              </div>
              {(acessos || []).length === 0 ? (
                <div className="vazio">Nenhum acesso registrado.</div>
              ) : (
                <div className="tabela-box">
                  <table className="tabela">
                    <thead><tr><th>Plataforma</th><th>Detalhe</th><th>Status</th><th aria-label="Ações"></th></tr></thead>
                    <tbody>
                      {acessos.map((a) => (
                        <tr key={a.id}>
                          <td><span className={'pill t-' + corAvatar(a.plataforma)}>{a.plataforma}</span></td>
                          <td style={{ color: 'var(--texto3)' }}>{a.detalhe || '—'}</td>
                          <td>
                            <form action={alternarAcesso}>
                              <input type="hidden" name="cliente_id" value={c.id} />
                              <input type="hidden" name="acesso_id" value={a.id} />
                              <input type="hidden" name="liberado" value={a.liberado ? '0' : '1'} />
                              <button type="submit" className={'pill ' + (a.liberado ? 't-green' : 't-amber')} style={{ border: 0, cursor: 'pointer' }}>
                                {a.liberado ? 'Liberado' : 'Pendente'}
                              </button>
                            </form>
                          </td>
                          <td>
                            <form action={removerAcesso}>
                              <input type="hidden" name="cliente_id" value={c.id} />
                              <input type="hidden" name="acesso_id" value={a.id} />
                              <button type="submit" className="btn-perigo">Remover</button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <span className="small muted">
                Time: {membros.filter((m) => m.acesso_liberado).length} de {membros.length} pessoas com acesso liberado.{' '}
                <Link href={`/clientes/${c.id}?aba=time`}>Ver time</Link>
              </span>
            </section>
            <form action={adicionarAcesso} className="card">
              <h2 className="h2">Adicionar acesso</h2>
              <input type="hidden" name="cliente_id" value={c.id} />
              <div className="form-grid">
                <div className="campo">
                  <label htmlFor="ac-plat">Plataforma *</label>
                  <input id="ac-plat" name="plataforma" list="plataformas" required />
                  <datalist id="plataformas">
                    <option value="Zoom" />
                    <option value="Plataforma da mentoria" />
                    <option value="Grupo do WhatsApp" />
                    <option value="Drive de materiais" />
                  </datalist>
                </div>
                <div className="campo"><label htmlFor="ac-det">Detalhe (quem, quais e-mails)</label><input id="ac-det" name="detalhe" /></div>
                <div className="campo">
                  <label htmlFor="ac-lib">Status</label>
                  <select id="ac-lib" name="liberado" defaultValue="0">
                    <option value="0">Pendente</option>
                    <option value="1">Liberado</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>Adicionar</button>
            </form>
          </>
        )}

        {sec === 'formularios' && (
          <>
            <section className="card">
              <div className="entre">
                <h2 className="h2">Formulário de entrada</h2>
                {c.formulario_em ? <span className="pill t-green">Preenchido em {fmtData(c.formulario_em)}</span> : <span className="pill t-amber">Pendente</span>}
              </div>
              <div className="card-2 pilha-p">
                <span className="small muted">Link para mandar ao cliente</span>
                <span style={{ wordBreak: 'break-all' }}>{`${origem()}/formulario/${c.token}`}</span>
                <CopiarTexto texto={`${origem()}/formulario/${c.token}`} rotulo="Copiar link" />
              </div>
              {c.formulario ? (
                <div className="pilha" style={{ gap: 0 }}>
                  {CAMPOS_FORMULARIO.map((f) => (
                    <div key={f.k} className="entre" style={{ padding: '12px 0', borderBottom: '1px solid var(--borda)', alignItems: 'flex-start' }}>
                      <span className="muted" style={{ flex: '1 1 200px' }}>{f.label}</span>
                      <span style={{ flex: '2 1 280px', whiteSpace: 'pre-line' }}>{c.formulario[f.k] || '—'}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
            <section className="card">
              <div className="entre">
                <h2 className="h2">Assessment</h2>
                <Link href="/assessment" className="small" style={{ fontWeight: 600 }}>Ver todos os assessments</Link>
              </div>
              {(respostas || []).length === 0 ? (
                <div className="vazio">Ninguém deste cliente respondeu o assessment ainda.</div>
              ) : (
                respostas.map((resp) => (
                  <div key={resp.id} className="card-2 pilha">
                    <div className="entre">
                      <span style={{ fontWeight: 600 }}>{resp.nome}</span>
                      <span className="small muted">{fmtDataHora(resp.criado_em)}</span>
                    </div>
                    {(Array.isArray(resp.respostas) ? resp.respostas : []).map((q, i) => (
                      <div key={i} className="pilha-p" style={{ gap: 2 }}>
                        <span className="small muted">{q.pergunta}</span>
                        <span style={{ whiteSpace: 'pre-line' }}>{q.resposta || '—'}</span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {sec === 'arquivos' && (
          <section className="card">
            <h2 className="h2">Arquivos do cliente</h2>
            <UploadArquivo clienteId={c.id} />
            {(arquivos || []).length === 0 ? (
              <div className="vazio">Nenhum arquivo anexado.</div>
            ) : (
              SETORES.filter((s) => arquivos.some((a) => a.setor === s)).map((s) => (
                <div key={s} className="pilha" style={{ gap: 8 }}>
                  <span className={'pill t-' + COR_SETOR[s]} style={{ alignSelf: 'flex-start' }}>{s}</span>
                  {arquivos
                    .filter((a) => a.setor === s)
                    .map((a) => (
                      <div key={a.id} className="card-2 entre" style={{ padding: '12px 14px' }}>
                        <span className="pilha-p" style={{ gap: 2, flex: '1 1 240px', minWidth: 0 }}>
                          {links[a.caminho] ? (
                            <a href={links[a.caminho]} target="_blank" rel="noreferrer" style={{ color: 'var(--texto)', fontWeight: 600, wordBreak: 'break-all' }}>{a.nome}</a>
                          ) : (
                            <span style={{ fontWeight: 600, wordBreak: 'break-all' }}>{a.nome}</span>
                          )}
                          <span className="small muted">{fmtData(a.criado_em)} {a.tamanho ? '· ' + fmtTamanho(a.tamanho) : ''}</span>
                        </span>
                        <form action={removerArquivo}>
                          <input type="hidden" name="cliente_id" value={c.id} />
                          <input type="hidden" name="arquivo_id" value={a.id} />
                          <input type="hidden" name="caminho" value={a.caminho} />
                          <button type="submit" className="btn-perigo">Excluir</button>
                        </form>
                      </div>
                    ))}
                </div>
              ))
            )}
          </section>
        )}
      </div>

      <aside className="col-lateral">
        <section className="card" style={{ gap: 0 }}>
          <h2 className="h2" style={{ marginBottom: 8 }}>O que tem no dossiê</h2>
          {SECOES.map(([k, nome, cor]) => (
            <Link key={k} href={`/clientes/${c.id}?aba=dossie&sec=${k}`} className="entre" style={{ padding: '12px 0', borderBottom: '1px solid var(--borda)', color: 'var(--texto)' }}>
              <span>{nome}</span>
              <span className={'pill t-' + cor}>{resumo[k]}</span>
            </Link>
          ))}
        </section>
      </aside>
    </div>
  );
}
