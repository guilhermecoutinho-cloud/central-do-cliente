'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Escolha from './Escolha';
import { PRIORIDADES, STATUS, atrasada, corPrioridade, corStatus, fmtPrazo, fmtQuando } from '@/lib/tarefas';
import { corAvatar, iniciais } from '@/lib/util';
import {
  adicionarSubtarefa,
  alternarSubtarefa,
  atualizarTarefa,
  excluirTarefa,
  publicarAtualizacao,
  removerAtualizacao,
  removerSubtarefa,
} from '@/app/actions-tarefas';

function Avatar({ nome, id, tamanho = 30 }) {
  if (!nome) return <span className="av-vazio" aria-hidden="true">+</span>;
  return (
    <span className={'av t-' + corAvatar(id || nome)} style={{ width: tamanho, height: tamanho, borderRadius: '50%', fontSize: 11 }}>
      {iniciais(nome)}
    </span>
  );
}

export default function TarefaEditor({ tarefa: inicial, subtarefas: subsIniciais, atualizacoes, atividade, grupos, equipe, hoje, eu }) {
  const router = useRouter();
  const [t, setT] = useState(inicial);
  const [subs, setSubs] = useState(subsIniciais);
  const [novaSub, setNovaSub] = useState('');
  const [comentario, setComentario] = useState('');
  const [erro, setErro] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [salvando, iniciar] = useTransition();
  const setor = inicial.setor;

  useEffect(() => setT(inicial), [inicial]);
  useEffect(() => setSubs(subsIniciais), [subsIniciais]);

  function avisarErro(e) {
    setErro(e?.message || 'Não foi possível salvar.');
    setTimeout(() => setErro(''), 5000);
  }

  function mudar(campo, valor, rotulo) {
    const antes = t[campo];
    if (valor === antes) return;
    setT({ ...t, [campo]: valor });
    iniciar(async () => {
      try {
        await atualizarTarefa({ id: t.id, setor, campo, valor, rotulo });
        router.refresh();
      } catch (e) {
        setT((x) => ({ ...x, [campo]: antes }));
        avisarErro(e);
      }
    });
  }

  function acao(fn, depois) {
    iniciar(async () => {
      try {
        await fn();
        if (depois) depois();
        router.refresh();
      } catch (e) {
        avisarErro(e);
      }
    });
  }

  const st = corStatus(t.status);
  const pr = corPrioridade(t.prioridade);
  const resp = equipe.find((p) => p.user_id === t.responsavel);
  const feitas = subs.filter((s) => s.feito).length;
  const pct = subs.length ? Math.round((feitas / subs.length) * 100) : 0;
  const grupo = grupos.find((g) => g.id === t.grupo_id);

  return (
    <>
      <div className="pilha-p">
        <span className="small muted">
          <Link href={`/setor/${setor}`}>{inicial.setorNome}</Link>
          {grupo ? ` · ${grupo.nome}` : ''}
        </span>
        <label htmlFor="titulo-tarefa" className="sr-only">Nome da tarefa</label>
        <input
          id="titulo-tarefa"
          key={'tit-' + inicial.titulo}
          className="titulo-edit"
          defaultValue={t.titulo}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== t.titulo) mudar('titulo', v, v);
            else e.target.value = t.titulo;
          }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </div>

      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(170px, 100%), 1fr))' }}>
        <div className="card-2 pilha-p" style={{ gap: 8 }}>
          <span className="small muted">Status</span>
          <Escolha
            rotulo="Status"
            botaoClasse="cel-cor"
            botaoEstilo={{ background: st.bg, color: st.fg }}
            botao={t.status}
            valor={t.status}
            opcoes={STATUS.map((s) => ({ valor: s.nome, rotulo: s.nome, estilo: { background: s.bg, color: s.fg, justifyContent: 'center' } }))}
            onEscolher={(v) => mudar('status', v, v)}
          />
        </div>
        <div className="card-2 pilha-p" style={{ gap: 8 }}>
          <span className="small muted">Responsável</span>
          <Escolha
            rotulo="Responsável"
            botaoClasse="cel-cor"
            botaoEstilo={{ background: 'var(--card)', color: 'var(--texto)', justifyContent: 'flex-start', gap: 8 }}
            botao={<>{resp ? <Avatar nome={resp.nome} id={resp.user_id} tamanho={26} /> : null}{resp ? resp.nome : 'Ninguém'}</>}
            valor={t.responsavel || null}
            largura={220}
            opcoes={[
              { valor: null, rotulo: 'Ninguém' },
              ...equipe.map((p) => ({ valor: p.user_id, rotulo: p.nome, conteudo: (<><Avatar nome={p.nome} id={p.user_id} tamanho={24} />{p.nome}</>) })),
            ]}
            onEscolher={(v, rot) => mudar('responsavel', v, rot)}
          />
        </div>
        <div className="card-2 pilha-p" style={{ gap: 8 }}>
          <label className="small muted" htmlFor="prazo-tarefa">Prazo {t.prazo ? `· ${fmtPrazo(t.prazo, hoje)}` : ''}</label>
          <input
            id="prazo-tarefa"
            type="date"
            className={'data-cel' + (atrasada(t, hoje) ? ' atrasada' : '')}
            style={{ border: '1px solid var(--borda2)', minHeight: 38 }}
            value={t.prazo || ''}
            onChange={(e) => mudar('prazo', e.target.value || null, e.target.value ? fmtPrazo(e.target.value) : 'sem prazo')}
          />
        </div>
        <div className="card-2 pilha-p" style={{ gap: 8 }}>
          <span className="small muted">Prioridade</span>
          <Escolha
            rotulo="Prioridade"
            botaoClasse="cel-cor"
            botaoEstilo={{ background: pr.bg, color: pr.fg }}
            botao={t.prioridade}
            valor={t.prioridade}
            opcoes={PRIORIDADES.map((p) => ({ valor: p.nome, rotulo: p.nome, estilo: { background: p.bg, color: p.fg, justifyContent: 'center' } }))}
            onEscolher={(v) => mudar('prioridade', v, v)}
          />
        </div>
        <div className="card-2 pilha-p" style={{ gap: 8 }}>
          <span className="small muted">Grupo</span>
          <Escolha
            rotulo="Grupo"
            botaoClasse="cel-cor"
            botaoEstilo={{ background: 'var(--card)', color: 'var(--texto)' }}
            botao={grupo ? grupo.nome : 'Sem grupo'}
            valor={t.grupo_id || null}
            opcoes={grupos.map((g) => ({ valor: g.id, rotulo: g.nome }))}
            onEscolher={(v, rot) => mudar('grupo_id', v, rot)}
          />
        </div>
      </div>

      <div className="colunas">
        <div className="col-principal">
          <section className="card">
            <h2 className="h2">Descrição</h2>
            <label htmlFor="descricao" className="sr-only">Descrição</label>
            <textarea
              id="descricao"
              key={'desc-' + (inicial.descricao || '')}
              className="input"
              style={{ minHeight: 110, resize: 'vertical', lineHeight: 1.55 }}
              defaultValue={t.descricao || ''}
              placeholder="Detalhes, links, o que precisa ser entregue..."
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (t.descricao || '')) mudar('descricao', v, null);
              }}
            />
          </section>

          <section className="card">
            <div className="entre">
              <h2 className="h2">Subtarefas</h2>
              <span className="small muted">{feitas} de {subs.length} feitas</span>
            </div>
            {subs.length ? (
              <div className="barra"><span className="s-green" style={{ width: pct + '%', animation: 'none', transition: 'width .3s' }} /></div>
            ) : null}
            {subs.map((s) => (
              <div key={s.id} className="linha" style={{ flexWrap: 'nowrap', gap: 8 }}>
                <button
                  type="button"
                  className={'tarefa' + (s.feito ? ' ok' : '')}
                  aria-pressed={s.feito}
                  disabled={String(s.id).startsWith('nova-')}
                  onClick={() => {
                    const novo = !s.feito;
                    setSubs(subs.map((x) => (x.id === s.id ? { ...x, feito: novo } : x)));
                    acao(() => alternarSubtarefa({ id: s.id, tarefa_id: t.id, setor, feito: novo, texto: s.texto }));
                  }}
                >
                  <span className={'check' + (s.feito ? ' ok' : '')} aria-hidden="true">{s.feito ? '✓' : ''}</span>
                  <span className="txt">{s.texto}</span>
                </button>
                <button
                  type="button"
                  className="btn-perigo"
                  aria-label={'Remover subtarefa ' + s.texto}
                  disabled={String(s.id).startsWith('nova-')}
                  onClick={() => {
                    setSubs(subs.filter((x) => x.id !== s.id));
                    acao(() => removerSubtarefa({ id: s.id, tarefa_id: t.id, setor }));
                  }}
                >
                  Remover
                </button>
              </div>
            ))}
            <form
              className="linha"
              style={{ flexWrap: 'nowrap' }}
              onSubmit={(e) => {
                e.preventDefault();
                const texto = novaSub.trim();
                if (!texto) return;
                setSubs([...subs, { id: 'nova-' + Date.now(), texto, feito: false }]);
                setNovaSub('');
                acao(() => adicionarSubtarefa({ tarefa_id: t.id, setor, texto }));
              }}
            >
              <input className="input" value={novaSub} onChange={(e) => setNovaSub(e.target.value)} placeholder="+ Adicionar subtarefa" aria-label="Nova subtarefa" />
              <button type="submit" className="btn btn-p">Adicionar</button>
            </form>
          </section>

          <section className="card" style={{ borderColor: 'rgba(240,134,110,.25)' }}>
            {confirmar ? (
              <div className="entre">
                <span style={{ color: 'var(--coral)' }}>Excluir esta tarefa, as subtarefas e as atualizações? Não tem como desfazer.</span>
                <span className="linha">
                  <button type="button" className="btn btn-p" style={{ background: 'var(--coral)' }} disabled={salvando} onClick={() => iniciar(() => excluirTarefa({ id: t.id, setor }))}>Excluir</button>
                  <button type="button" className="btn btn-p btn-sec" onClick={() => setConfirmar(false)}>Cancelar</button>
                </span>
              </div>
            ) : (
              <button type="button" className="btn-perigo" style={{ alignSelf: 'flex-start' }} onClick={() => setConfirmar(true)}>Excluir tarefa</button>
            )}
          </section>
        </div>

        <aside className="col-lateral" style={{ flexBasis: 360 }}>
          <section className="card">
            <h2 className="h2">Atualizações</h2>
            <form
              className="pilha"
              onSubmit={(e) => {
                e.preventDefault();
                const texto = comentario.trim();
                if (!texto) return;
                acao(() => publicarAtualizacao({ tarefa_id: t.id, setor, texto }), () => setComentario(''));
              }}
            >
              <label htmlFor="comentario" className="sr-only">Escrever atualização</label>
              <textarea
                id="comentario"
                className="input"
                style={{ minHeight: 84, resize: 'vertical' }}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Escreva uma atualização para o time"
              />
              <button type="submit" className="btn btn-p" style={{ alignSelf: 'flex-end' }} disabled={salvando || !comentario.trim()}>Publicar</button>
            </form>
            {atualizacoes.length === 0 ? <span className="small muted">Nenhuma atualização ainda.</span> : null}
            {atualizacoes.map((a) => (
              <div key={a.id} className="mural-item">
                <Avatar nome={a.autor_nome || '?'} id={a.autor} tamanho={34} />
                <div className="pilha-p" style={{ gap: 4, minWidth: 0, flex: 1 }}>
                  <span className="small">
                    <strong>{a.autor_nome || 'Alguém'}</strong> <span className="muted">· {fmtQuando(a.criado_em)}</span>
                  </span>
                  <span style={{ color: 'var(--texto2)', lineHeight: 1.5, whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{a.texto}</span>
                  {a.autor === eu ? (
                    <button type="button" className="btn-perigo" style={{ alignSelf: 'flex-start', fontSize: 12 }} onClick={() => acao(() => removerAtualizacao({ id: a.id, tarefa_id: t.id, setor }))}>
                      Apagar
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </section>
          <section className="card">
            <h2 className="h2">Atividade</h2>
            {atividade.length === 0 ? <span className="small muted">Sem registros.</span> : null}
            {atividade.map((a) => (
              <span key={a.id} className="small muted" style={{ lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--texto3)' }}>{a.autor_nome}</strong> {a.texto} · {fmtQuando(a.criado_em)}
              </span>
            ))}
          </section>
        </aside>
      </div>

      {erro ? <div className="aviso t-coral toast" role="alert">{erro}</div> : null}
    </>
  );
}
