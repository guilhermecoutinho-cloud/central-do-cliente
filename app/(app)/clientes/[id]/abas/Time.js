import { adicionarMembro, alternarAcessoMembro, removerMembro } from '@/app/actions';
import { corAvatar, iniciais } from '@/lib/util';

export default function AbaTime({ c, membros }) {
  return (
    <>
      <div className="card" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: '8px 20px' }}>
        <span style={{ color: 'var(--verde)', fontWeight: 600 }}>Regra de acesso</span>
        <span style={{ color: 'var(--texto2)' }}>
          Só entra no Zoom quem está nesta lista, com o mesmo nome cadastrado. E-mail que não está aqui não é liberado.
        </span>
      </div>

      <section className="card">
        <div className="entre">
          <h2 className="h2">Quem vai participar</h2>
          <span className="small muted">{membros.length} {membros.length === 1 ? 'pessoa' : 'pessoas'}</span>
        </div>
        {membros.length === 0 ? (
          <div className="vazio">Ninguém cadastrado ainda.</div>
        ) : (
          <div className="tabela-box">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Cargo</th>
                  <th>Telefone</th>
                  <th>E-mail do computador</th>
                  <th>E-mail do celular</th>
                  <th>Acesso</th>
                  <th aria-label="Ações"></th>
                </tr>
              </thead>
              <tbody>
                {membros.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className="linha" style={{ flexWrap: 'nowrap' }}>
                        <span className={'av t-' + corAvatar(m.id)} style={{ width: 32, height: 32 }}>{iniciais(m.nome)}</span>
                        <span className="pilha-p" style={{ gap: 2 }}>
                          <span style={{ fontWeight: 600 }}>{m.nome}</span>
                          {m.papel ? <span className="small muted">{m.papel}</span> : null}
                        </span>
                      </span>
                    </td>
                    <td style={{ color: 'var(--texto2)' }}>{m.cargo || '—'}</td>
                    <td className="muted">{m.telefone || '—'}</td>
                    <td className="muted" style={{ wordBreak: 'break-all' }}>{m.email || '—'}</td>
                    <td style={{ wordBreak: 'break-all', color: m.email_celular ? 'var(--muted)' : 'var(--amber)' }}>{m.email_celular || 'falta informar'}</td>
                    <td>
                      <form action={alternarAcessoMembro}>
                        <input type="hidden" name="cliente_id" value={c.id} />
                        <input type="hidden" name="membro_id" value={m.id} />
                        <input type="hidden" name="liberado" value={m.acesso_liberado ? '0' : '1'} />
                        <button type="submit" className={'pill ' + (m.acesso_liberado ? 't-green' : 't-amber')} style={{ border: 0, cursor: 'pointer' }} title="Clique para alternar">
                          {m.acesso_liberado ? 'Liberado' : 'Pendente'}
                        </button>
                      </form>
                    </td>
                    <td>
                      <form action={removerMembro}>
                        <input type="hidden" name="cliente_id" value={c.id} />
                        <input type="hidden" name="membro_id" value={m.id} />
                        <button type="submit" className="btn-perigo">Remover</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <form action={adicionarMembro} className="card">
        <h2 className="h2">Adicionar pessoa ao time</h2>
        <input type="hidden" name="cliente_id" value={c.id} />
        <div className="form-grid">
          <div className="campo"><label htmlFor="m-nome">Nome completo *</label><input id="m-nome" name="nome" required /></div>
          <div className="campo"><label htmlFor="m-cargo">Cargo</label><input id="m-cargo" name="cargo" /></div>
          <div className="campo"><label htmlFor="m-tel">Telefone</label><input id="m-tel" name="telefone" type="tel" /></div>
          <div className="campo"><label htmlFor="m-email">E-mail do computador</label><input id="m-email" name="email" type="email" /></div>
          <div className="campo"><label htmlFor="m-email2">E-mail do celular</label><input id="m-email2" name="email_celular" type="email" /></div>
          <div className="campo">
            <label htmlFor="m-papel">Papel</label>
            <select id="m-papel" name="papel" defaultValue="">
              <option value="">Participante</option>
              <option value="Decisor">Decisor</option>
              <option value="Contato do dia a dia">Contato do dia a dia</option>
              <option value="Financeiro">Financeiro</option>
            </select>
          </div>
        </div>
        <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>Adicionar</button>
      </form>
    </>
  );
}
