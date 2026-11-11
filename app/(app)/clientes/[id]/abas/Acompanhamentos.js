import { adicionarAcompanhamento, removerAcompanhamento } from '@/app/actions';
import { fmtData } from '@/lib/util';

export default function AbaAcompanhamentos({ c, acomps }) {
  return (
    <>
      <section className="card">
        <div className="entre">
          <h2 className="h2">Acompanhamentos</h2>
          <span className="small muted">Só o time vê</span>
        </div>
        {acomps.length === 0 ? (
          <div className="vazio">Nenhum acompanhamento registrado.</div>
        ) : (
          <div className="tabela-box">
            <table className="tabela">
              <thead>
                <tr><th>Data</th><th>Motivo</th><th>Como foi</th><th>O que foi proposto</th><th>Quem</th><th aria-label="Ações"></th></tr>
              </thead>
              <tbody>
                {acomps.map((a) => (
                  <tr key={a.id}>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{fmtData(a.data)}</td>
                    <td style={{ fontWeight: 600 }}>{a.motivo}</td>
                    <td style={{ color: 'var(--texto3)' }}>{a.como_foi || '—'}</td>
                    <td style={{ color: 'var(--texto3)' }}>{a.proposto || '—'}</td>
                    <td className="muted">{a.autor || '—'}</td>
                    <td>
                      <form action={removerAcompanhamento}>
                        <input type="hidden" name="cliente_id" value={c.id} />
                        <input type="hidden" name="acomp_id" value={a.id} />
                        <button type="submit" className="btn-perigo">Excluir</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <form action={adicionarAcompanhamento} className="card">
        <h2 className="h2">Registrar acompanhamento</h2>
        <input type="hidden" name="cliente_id" value={c.id} />
        <div className="form-grid">
          <div className="campo"><label htmlFor="a-data">Data</label><input id="a-data" name="data" type="date" /></div>
          <div className="campo"><label htmlFor="a-motivo">Motivo *</label><input id="a-motivo" name="motivo" required placeholder="Ex.: Reunião de alinhamento" /></div>
          <div className="campo"><label htmlFor="a-autor">Quem registrou</label><input id="a-autor" name="autor" /></div>
          <div className="campo inteiro"><label htmlFor="a-como">Como foi</label><textarea id="a-como" name="como_foi" /></div>
          <div className="campo inteiro"><label htmlFor="a-prop">O que foi proposto</label><textarea id="a-prop" name="proposto" /></div>
        </div>
        <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>Salvar</button>
      </form>
    </>
  );
}
