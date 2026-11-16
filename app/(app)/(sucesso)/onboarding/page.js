import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ETAPAS, totalTarefas } from '@/lib/onboarding';
import { COR_PRODUTO, PRODUTOS } from '@/lib/util';

export default async function OnboardingQuadro() {
  const supabase = createClient();
  const [{ data: clientes, error }, { data: tarefas }] = await Promise.all([
    supabase.from('clientes').select('id, nome, empresa, produto, status, etapa_onboarding, responsavel').neq('status', 'encerrado').order('criado_em'),
    supabase.from('onboarding_tarefas').select('cliente_id'),
  ]);
  if (error) throw new Error(error.message);

  const feitasPorCliente = {};
  (tarefas || []).forEach((t) => (feitasPorCliente[t.cliente_id] = (feitasPorCliente[t.cliente_id] || 0) + 1));
  const total = totalTarefas();
  const ultima = ETAPAS.length - 1;

  const colunas = ETAPAS.map((et, i) => ({
    et,
    clientes: (clientes || []).filter((c) => (c.status === 'ativo' ? ultima : Math.min(c.etapa_onboarding, ultima)) === i),
  }));

  // Números do topo: total, por produto e por etapa
  const lista = clientes || [];
  const totalClientes = lista.length;
  const emOnboarding = lista.filter((c) => c.status === 'onboarding').length;
  const produtos = [...PRODUTOS, ...new Set(lista.map((c) => c.produto).filter((p) => !PRODUTOS.includes(p)))];
  const porProduto = produtos.map((p) => ({ nome: p, n: lista.filter((c) => c.produto === p).length }));
  const porEtapa = colunas.map(({ et, clientes: l }) => ({ nome: et.nome, n: l.length }));
  const maiorProduto = Math.max(1, ...porProduto.map((x) => x.n));
  const maiorEtapa = Math.max(1, ...porEtapa.map((x) => x.n));

  return (
    <>
      <div className="topo anim">
        <div>
          <span className="eyebrow">Responsabilidade do Sucesso do Cliente</span>
          <h1 className="titulo">Onboarding de clientes</h1>
        </div>
        <Link href="/clientes/novo" className="btn">+ Cliente novo</Link>
      </div>

      <div className="grid-kpi anim anim-1">
        <div className="kpi">
          <span className="muted">Clientes ativos</span>
          <span className="valor">{totalClientes}</span>
          <span className="small muted">todos os produtos</span>
        </div>
        <div className="kpi">
          <span className="muted">Em onboarding</span>
          <span className="valor">{emOnboarding}</span>
          <span className="small muted">ainda nas etapas iniciais</span>
        </div>
        <div className="kpi">
          <span className="muted">Já nos encontros</span>
          <span className="valor">{totalClientes - emOnboarding}</span>
          <span className="small muted">onboarding concluído</span>
        </div>
      </div>

      <div className="grid-painel anim anim-1">
        <section className="card">
          <div className="entre">
            <h2 className="h2">Clientes por produto</h2>
            <span className="small muted">{totalClientes} no total</span>
          </div>
          <div className="graf-barras">
            {porProduto.map((x, i) => (
              <div key={x.nome} className="graf-barra">
                <span className="rot">{x.nome}</span>
                <span className="trilho"><span style={{ width: (x.n / maiorProduto) * 100 + '%', animationDelay: i * 0.05 + 's' }} /></span>
                <span className="num">{x.n}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <div className="entre">
            <h2 className="h2">Clientes por etapa</h2>
            <span className="small muted">colunas do quadro abaixo</span>
          </div>
          <div className="graf-barras">
            {porEtapa.map((x, i) => (
              <div key={x.nome} className="graf-barra">
                <span className="rot">{x.nome}</span>
                <span className="trilho"><span style={{ width: (x.n / maiorEtapa) * 100 + '%', animationDelay: i * 0.05 + 's' }} /></span>
                <span className="num">{x.n}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="card anim anim-2" style={{ padding: '14px 18px', color: 'var(--texto3)' }}>
        Cada cliente é um cartão. Ele anda pelas etapas e cada etapa tem o seu checklist. Se a responsável não puder, quem assumir abre o cartão e continua de onde parou.
      </div>

      <div className="kanban anim anim-2">
        {colunas.map(({ et, clientes: lista }, i) => (
          <section key={et.nome} className="coluna" aria-label={et.nome}>
            <div className="entre" style={{ gap: 8 }}>
              <span className={'pill t-' + et.cor}>{et.nome}</span>
              <span className="small muted">{lista.length}</span>
            </div>
            {lista.length === 0 ? <span className="vazio">Nenhum cliente</span> : null}
            {lista.map((c) => {
              const feitas = feitasPorCliente[c.id] || 0;
              const pct = Math.round((feitas / total) * 100);
              return (
                <Link key={c.id} href={`/clientes/${c.id}?aba=onboarding`} className="cartao">
                  <span className="linha" style={{ flexWrap: 'nowrap', gap: 10 }}>
                    <span className="pilha-p" style={{ gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{c.nome}</span>
                      {c.empresa && c.empresa !== c.nome ? <span className="small muted">{c.empresa}</span> : null}
                    </span>
                  </span>
                  <span className="entre" style={{ gap: 6 }}>
                    <span className={'pill t-' + COR_PRODUTO[c.produto]}>{c.produto}</span>
                    <span className="small muted">{c.responsavel || 'sem resp.'}</span>
                  </span>
                  <span className="pilha-p">
                    <span className="small" style={{ color: 'var(--texto3)' }}>{feitas} de {total} tarefas</span>
                    <span className="barra" style={{ height: 4 }}><span className={'s-' + et.cor} style={{ width: pct + '%' }} /></span>
                  </span>
                </Link>
              );
            })}
          </section>
        ))}
      </div>

      <div className="grid-lado anim anim-3">
        <section className="card">
          <h2 className="h2">Boas práticas do time de onboard</h2>
          <div className="pilha" style={{ color: 'var(--texto3)' }}>
            <span>Estudar o cliente antes: ele nunca pode sentir que vai ter que explicar tudo de novo.</span>
            <span>Apresentar-se com segurança, evitando falar "eu acho".</span>
            <span>Gravar todas as reuniões e salvar no dossiê do cliente.</span>
            <span>Deixar claro que temos regras, e que valem para todos.</span>
            <span>Marcar cada tarefa feita no cartão para qualquer um conseguir continuar.</span>
          </div>
        </section>
        <section className="card">
          <h2 className="h2">As etapas</h2>
          {ETAPAS.map((et) => (
            <div key={et.nome} className="linha" style={{ flexWrap: 'nowrap', alignItems: 'baseline' }}>
              <span className={'pill t-' + et.cor} style={{ flex: '0 0 auto' }}>{et.nome}</span>
              <span style={{ color: 'var(--texto3)' }}>{et.desc}</span>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
