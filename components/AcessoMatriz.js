'use client';

import { useEffect, useState, useTransition } from 'react';
import { alternarAcessoSetor } from '@/app/actions-tarefas';
import { SETORES } from '@/lib/setores';
import { corAvatar, iniciais } from '@/lib/util';

// Grade pessoa × setor que só o administrador vê.
export default function AcessoMatriz({ pessoas, acessos: iniciais_ }) {
  const [acessos, setAcessos] = useState(iniciais_);
  const [erro, setErro] = useState('');
  const [, iniciar] = useTransition();

  useEffect(() => setAcessos(iniciais_), [iniciais_]);

  function alternar(p, slug) {
    const chave = p.user_id + ':' + slug;
    const liberar = !acessos[chave];
    setAcessos({ ...acessos, [chave]: liberar });
    iniciar(async () => {
      try {
        await alternarAcessoSetor({ user_id: p.user_id, setor: slug, liberar });
      } catch (e) {
        setAcessos((a) => ({ ...a, [chave]: !liberar }));
        setErro(e?.message || 'Não foi possível salvar.');
        setTimeout(() => setErro(''), 5000);
      }
    });
  }

  return (
    <section className="card">
      <div className="entre" style={{ alignItems: 'flex-end' }}>
        <div className="pilha-p">
          <h2 className="h2">Acesso por usuário</h2>
          <span className="small muted">Só o administrador vê esta parte. Clique para liberar ou bloquear um setor.</span>
        </div>
        <span className="pill t-violet">Visão do administrador</span>
      </div>
      <div className="tabela-box">
        <table className="tabela cartoes">
          <thead>
            <tr>
              <th>Pessoa</th>
              {SETORES.map((s) => <th key={s.slug} style={{ textAlign: 'center' }}>{s.nome}</th>)}
            </tr>
          </thead>
          <tbody>
            {pessoas.map((p) => (
              <tr key={p.user_id}>
                <td className="principal">
                  <span className="linha" style={{ flexWrap: 'nowrap' }}>
                    <span className={'av t-' + corAvatar(p.user_id)} style={{ width: 32, height: 32, borderRadius: '50%' }}>{iniciais(p.nome)}</span>
                    <span className="pilha-p" style={{ gap: 2 }}>
                      <span style={{ fontWeight: 600 }}>{p.nome}</span>
                      <span className="small muted">{p.papel === 'admin' ? 'Administrador · vê tudo' : 'Equipe'}</span>
                    </span>
                  </span>
                </td>
                {SETORES.map((s) => {
                  const ok = p.papel === 'admin' || !!acessos[p.user_id + ':' + s.slug];
                  return (
                    <td key={s.slug} data-label={s.nome} style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => alternar(p, s.slug)}
                        disabled={p.papel === 'admin'}
                        aria-pressed={ok}
                        aria-label={(ok ? 'Bloquear ' : 'Liberar ') + s.nome + ' para ' + p.nome}
                        style={{
                          width: 44, height: 36, borderRadius: 10, cursor: p.papel === 'admin' ? 'default' : 'pointer', fontSize: 15, fontWeight: 700,
                          background: ok ? 'rgba(98,204,116,0.16)' : 'transparent',
                          color: ok ? 'var(--verde)' : '#3a4a40',
                          border: ok ? '1px solid rgba(98,204,116,0.4)' : '1px dashed var(--borda2)',
                        }}
                      >
                        {ok ? '✓' : '—'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className="small muted">Para colocar uma pessoa nova na equipe, crie o usuário no Supabase e rode o comando do README.</span>
      {erro ? <div className="aviso t-coral toast" role="alert">{erro}</div> : null}
    </section>
  );
}
