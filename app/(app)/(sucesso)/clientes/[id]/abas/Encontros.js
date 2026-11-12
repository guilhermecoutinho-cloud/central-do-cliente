import Link from 'next/link';
import { registrarRenovacao } from '@/app/actions';
import { fmtDataHora } from '@/lib/util';

export default function AbaEncontros({ c, r }) {
  const linhas = [
    ...r.passados.map((e) => ({
      e,
      status: r.presentesEm.has(e.id) ? 'Presente' : r.comChamada.has(e.id) ? 'Faltou' : 'Sem chamada',
      cor: r.presentesEm.has(e.id) ? 't-green' : r.comChamada.has(e.id) ? 't-amber' : 't-gray',
    })),
    ...r.futuros.map((e, i) => ({ e, status: i === 0 ? 'Próximo' : 'Agendado', cor: i === 0 ? 's-green' : 't-gray', futuro: true })),
  ];

  return (
    <div className="colunas">
      <section className="card col-principal">
        <div className="pilha-p">
          <h2 className="h2">Mapa de encontros · {c.produto}</h2>
          <span className="muted">Todo encontro do produto desde a data de início conta no saldo, mesmo se ele faltar.</span>
        </div>
        <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
          <div className="card-2 t-blue" style={{ border: 0 }}><div className="small">Contratados</div><div style={{ fontSize: 28, fontWeight: 700 }}>{r.contratados}</div></div>
          <div className="card-2 t-green" style={{ border: 0 }}><div className="small">Participou</div><div style={{ fontSize: 28, fontWeight: 700 }}>{r.participou}</div></div>
          <div className="card-2 t-amber" style={{ border: 0 }}><div className="small">Faltou</div><div style={{ fontSize: 28, fontWeight: 700 }}>{r.faltou}</div></div>
          <div className="card-2 s-green" style={{ border: 0, color: 'var(--verde-escuro)' }}><div className="small" style={{ fontWeight: 600 }}>Ainda tem</div><div style={{ fontSize: 28, fontWeight: 800 }}>{r.saldo}</div></div>
        </div>
        {linhas.length === 0 ? (
          <div className="vazio">Nenhum encontro de {c.produto} cadastrado a partir da data de início. <Link href="/encontros">Cadastrar encontros</Link></div>
        ) : (
          <div className="pilha" style={{ gap: 8 }}>
            {linhas.map(({ e, status, cor, futuro }, i) => (
              <Link key={e.id} href={`/encontros/${e.id}`} className="cartao" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14, borderStyle: futuro ? 'dashed' : 'solid' }}>
                <span className="num t-gray" style={{ width: 30, height: 30, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
                <span style={{ flex: '1 1 200px', fontWeight: 600 }}>{e.titulo}</span>
                <span className="small muted">{fmtDataHora(e.data)}</span>
                <span className={'pill ' + cor} style={cor === 's-green' ? { color: 'var(--verde-escuro)' } : {}}>{status}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <aside className="col-lateral">
        <form action={registrarRenovacao} className="card">
          <h2 className="h2">Renovação antecipada</h2>
          <span className="muted">Se ele renovar antes de acabar, o saldo soma. Ex.: tinha 1 e renovou 3, fica com 4.</span>
          <input type="hidden" name="id" value={c.id} />
          <div className="campo"><label htmlFor="r-qtd">Encontros a mais</label><input id="r-qtd" name="quantidade" type="number" min="1" required /></div>
          <div className="campo"><label htmlFor="r-obs">Observação</label><input id="r-obs" name="obs" /></div>
          <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>Registrar renovação</button>
        </form>
      </aside>
    </div>
  );
}
