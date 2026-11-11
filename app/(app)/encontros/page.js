import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { criarEncontro } from '@/app/actions';
import { COR_PRODUTO, PRODUTOS, fmtDataHora } from '@/lib/util';

export default async function Encontros({ searchParams }) {
  const filtro = PRODUTOS.includes(searchParams?.produto) ? searchParams.produto : null;
  const supabase = createClient();
  let q = supabase.from('encontros').select('*').order('data');
  if (filtro) q = q.eq('produto', filtro);
  const [{ data: encontros, error }, { data: porEncontro }] = await Promise.all([
    q,
    supabase.from('presenca_encontro').select('encontro_id, presentes, faltas'),
  ]);
  if (error) throw new Error(error.message);

  const agora = new Date();
  const contagem = {};
  (porEncontro || []).forEach((p) => {
    contagem[p.encontro_id] = { sim: Number(p.presentes), nao: Number(p.faltas) };
  });
  const futuros = (encontros || []).filter((e) => new Date(e.data) > agora);
  const passados = (encontros || []).filter((e) => new Date(e.data) <= agora).reverse();

  const Linha = ({ e, futuro }) => {
    const k = contagem[e.id];
    return (
      <Link href={`/encontros/${e.id}`} className="cartao" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14, borderStyle: futuro ? 'dashed' : 'solid' }}>
        <span className={'pill t-' + COR_PRODUTO[e.produto]}>{e.produto}</span>
        <span style={{ flex: '1 1 220px', fontWeight: 600 }}>{e.titulo}</span>
        <span className="small muted">{fmtDataHora(e.data)}</span>
        {k ? (
          <span className="linha" style={{ gap: 6 }}>
            <span className="pill t-green">{k.sim} presentes</span>
            <span className="pill t-amber">{k.nao} faltas</span>
          </span>
        ) : (
          <span className="pill t-gray">{futuro ? 'Agendado' : 'Fazer chamada'}</span>
        )}
      </Link>
    );
  };

  return (
    <>
      <div className="topo anim">
        <div>
          <span className="eyebrow">MGA · Ambição · Mentoria · Imersão</span>
          <h1 className="titulo">Encontros e presença</h1>
        </div>
        <div className="segmentos" role="group" aria-label="Filtrar por produto">
          <Link href="/encontros" className={!filtro ? 'ativo' : ''}>Todos</Link>
          {PRODUTOS.map((p) => (
            <Link key={p} href={`/encontros?produto=${encodeURIComponent(p)}`} className={filtro === p ? 'ativo' : ''}>{p}</Link>
          ))}
        </div>
      </div>

      <div className="colunas">
        <div className="col-principal">
          <section className="card anim anim-1">
            <h2 className="h2">Próximos</h2>
            {futuros.length === 0 ? <div className="vazio">Nenhum encontro agendado.</div> : futuros.map((e) => <Linha key={e.id} e={e} futuro />)}
          </section>
          <section className="card anim anim-2">
            <h2 className="h2">Já aconteceram</h2>
            {passados.length === 0 ? <div className="vazio">Nenhum encontro ainda.</div> : passados.map((e) => <Linha key={e.id} e={e} />)}
          </section>
        </div>

        <aside className="col-lateral anim anim-3">
          <form action={criarEncontro} className="card">
            <h2 className="h2">Cadastrar encontro</h2>
            <span className="muted">Cadastre o calendário inteiro de cada produto. A central usa as datas para calcular o saldo de cada cliente.</span>
            <div className="campo">
              <label htmlFor="e-prod">Produto *</label>
              <select id="e-prod" name="produto" required defaultValue={filtro || ''}>
                <option value="" disabled>Escolha</option>
                {PRODUTOS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="campo"><label htmlFor="e-tit">Título ou tema *</label><input id="e-tit" name="titulo" required placeholder="Ex.: Encontro 3 · Gestão de pessoas" /></div>
            <div className="campo"><label htmlFor="e-data">Data e hora (Brasília) *</label><input id="e-data" name="data" type="datetime-local" required /></div>
            <div className="campo"><label htmlFor="e-link">Link do Zoom</label><input id="e-link" name="link" type="url" placeholder="https://" /></div>
            <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>Cadastrar</button>
          </form>
        </aside>
      </div>
    </>
  );
}
