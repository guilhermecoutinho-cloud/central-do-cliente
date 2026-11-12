'use client';

import { useState } from 'react';
import { criarTarefasEmLote, sugerirTarefas } from '@/app/actions-ia';
import { PRIORIDADES, STATUS } from '@/lib/tarefas';

const EXEMPLO = `Ex.: reunião de hoje
- arte do GI Alphaville pra sexta, urgente, Guilherme
- confirmar coffee break com o buffet até amanhã
- revisar copy da trilha de conteúdo`;

// Painel "Criar com IA": texto livre → Gemini separa as tarefas → a pessoa revisa → cria.
export default function CriarComIA({ setor, grupos, equipe, onFechar, onCriadas }) {
  const [texto, setTexto] = useState('');
  const [itens, setItens] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function separar() {
    setErro('');
    setCarregando(true);
    try {
      const r = await sugerirTarefas({ setor: setor.slug, texto });
      if (r.erro) setErro(r.erro);
      else setItens(r.tarefas);
    } catch (e) {
      setErro(e?.message || 'Não foi possível falar com a IA.');
    } finally {
      setCarregando(false);
    }
  }

  async function criar() {
    setErro('');
    setCarregando(true);
    try {
      const n = await criarTarefasEmLote({ setor: setor.slug, tarefas: itens });
      onCriadas(n);
    } catch (e) {
      setErro(e?.message || 'Não foi possível criar as tarefas.');
      setCarregando(false);
    }
  }

  function mudar(chave, campo, valor) {
    setItens((lista) => lista.map((x) => (x.chave === chave ? { ...x, [campo]: valor } : x)));
  }

  return (
    <section className="card faixa tom-violet ia-painel">
      <div className="entre">
        <div className="pilha-p">
          <h2 className="h2">Criar tarefas com IA</h2>
          <span className="small muted">
            {itens ? 'Confira e ajuste antes de criar.' : 'Cole uma lista, a ata de uma reunião ou uma mensagem. O Gemini separa as tarefas.'}
          </span>
        </div>
        <button type="button" className="btn-link" onClick={onFechar}>Fechar</button>
      </div>

      {!itens ? (
        <>
          <textarea
            className="input"
            rows={7}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={EXEMPLO}
            maxLength={15000}
            autoFocus
            style={{ resize: 'vertical', minHeight: 150, lineHeight: 1.5 }}
          />
          <div className="linha">
            <button type="button" className="btn" onClick={separar} disabled={carregando || texto.trim().length < 3}>
              {carregando ? 'Separando as tarefas…' : 'Separar tarefas'}
            </button>
            <span className="small muted">Nada é criado antes de você revisar.</span>
          </div>
        </>
      ) : (
        <>
          <div className="ia-lista">
            {itens.map((x) => (
              <div key={x.chave} className="ia-item">
                <input
                  className="input ia-titulo"
                  value={x.titulo}
                  onChange={(e) => mudar(x.chave, 'titulo', e.target.value)}
                  aria-label="Nome da tarefa"
                />
                <select className="input" value={x.grupo_id} onChange={(e) => mudar(x.chave, 'grupo_id', e.target.value)} aria-label="Grupo">
                  {grupos.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>
                <select className="input" value={x.status} onChange={(e) => mudar(x.chave, 'status', e.target.value)} aria-label="Status">
                  {STATUS.map((s) => <option key={s.nome}>{s.nome}</option>)}
                </select>
                <input className="input" type="date" value={x.prazo} onChange={(e) => mudar(x.chave, 'prazo', e.target.value)} aria-label="Prazo" style={{ colorScheme: 'dark' }} />
                <select className="input" value={x.prioridade} onChange={(e) => mudar(x.chave, 'prioridade', e.target.value)} aria-label="Prioridade">
                  {PRIORIDADES.map((p) => <option key={p.nome}>{p.nome}</option>)}
                </select>
                <select className="input" value={x.responsavel} onChange={(e) => mudar(x.chave, 'responsavel', e.target.value)} aria-label="Responsável">
                  <option value="">Sem responsável</option>
                  {equipe.map((p) => <option key={p.user_id} value={p.user_id}>{p.nome}</option>)}
                </select>
                <button type="button" className="btn-perigo ia-remover" onClick={() => setItens((l) => l.filter((y) => y.chave !== x.chave))} aria-label="Tirar esta tarefa">
                  ×
                </button>
                {x.descricao ? <span className="small muted ia-desc">{x.descricao}</span> : null}
              </div>
            ))}
          </div>
          <div className="linha">
            <button type="button" className="btn" onClick={criar} disabled={carregando || !itens.length}>
              {carregando ? 'Criando…' : `Criar ${itens.length} ${itens.length === 1 ? 'tarefa' : 'tarefas'}`}
            </button>
            <button type="button" className="btn btn-sec" onClick={() => setItens(null)} disabled={carregando}>Voltar ao texto</button>
          </div>
        </>
      )}

      {erro ? <div className="aviso t-coral" role="alert">{erro}</div> : null}
    </section>
  );
}
