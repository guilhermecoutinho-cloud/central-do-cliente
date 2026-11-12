import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ETAPAS, totalTarefas } from '@/lib/onboarding';
import { COR_PRODUTO, corAvatar, iniciais } from '@/lib/util';

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

  return (
    <>
      <div className="topo anim">
        <div>
          <span className="eyebrow">Responsabilidade do Sucesso do Cliente</span>
          <h1 className="titulo">Onboarding de clientes</h1>
        </div>
        <Link href="/clientes/novo" className="btn">+ Cliente novo</Link>
      </div>

      <div className="card anim anim-1" style={{ padding: '14px 18px', color: 'var(--texto3)' }}>
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
                    <span className={'av t-' + corAvatar(c.id)} style={{ width: 32, height: 32 }}>{iniciais(c.nome)}</span>
                    <span className="pilha-p" style={{ gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{c.nome}</span>
                      <span className="small muted">{c.empresa}</span>
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
