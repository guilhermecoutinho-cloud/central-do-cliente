import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { fmtReal } from '@/lib/compras';
import QuadroCompras, { NovoPipeline } from '@/components/QuadroCompras';
import SetorIcone from '@/components/SetorIcone';
import SemAcesso from '@/components/SemAcesso';

// Compras > pipeline (CAUP geral, Ambição...) > kanban com colunas editáveis
export default async function Compras({ searchParams }) {
  const perfil = await getPerfil();
  if (!podeSetor(perfil, 'financeiro')) return <SemAcesso setor="Financeiro" />;

  const supabase = createClient();
  const [{ data: pipelines, error }, { data: eventos }, { data: equipe }, { data: contagem }] = await Promise.all([
    supabase.from('compra_pipelines').select('id, nome, evento_id, ordem').order('ordem').order('criado_em'),
    supabase.from('eventos').select('id, nome, data_inicio').order('data_inicio', { ascending: false, nullsFirst: false }),
    supabase.from('equipe').select('user_id, nome').order('nome'),
    supabase.from('compras').select('pipeline_id'),
  ]);
  if (error) {
    return <div className="aviso t-amber">Falta ativar os pipelines de compras: rode de novo o arquivo supabase/financeiro-compras.sql no SQL Editor do Supabase.</div>;
  }

  const lista = pipelines || [];
  const topo = (
    <div className="topo">
      <div className="pilha-p">
        <span className="selo"><SetorIcone slug="financeiro" tamanho={24} />Financeiro</span>
        <h1 className="titulo">Compras</h1>
        <span className="small" style={{ color: 'var(--texto3)' }}>Um pipeline para cada evento ou frente. Cada um tem o seu kanban.</span>
      </div>
      <NovoPipeline eventos={eventos || []} />
    </div>
  );
  if (!lista.length) {
    return (
      <>
        {topo}
        <div className="card vazio-card">Nenhum pipeline ainda. Crie o primeiro em “Novo pipeline”.</div>
      </>
    );
  }

  const atual = lista.find((p) => p.id === searchParams?.p) || lista[0];
  const [{ data: etapas }, { data: compras }] = await Promise.all([
    supabase.from('compra_etapas').select('id, pipeline_id, nome, cor, ordem').eq('pipeline_id', atual.id).order('ordem').order('nome'),
    supabase
      .from('compras')
      .select('id, titulo, descricao, quantidade, valor, fornecedor, evento_id, pipeline_id, etapa_id, responsavel, prazo, ordem, criado_por, criado_em, compra_comentarios(count)')
      .eq('pipeline_id', atual.id)
      .order('criado_em', { ascending: false }),
  ]);

  const cols = etapas || [];
  const itens = (compras || []).map((c) => ({ ...c, comentarios: c.compra_comentarios?.[0]?.count || 0, compra_comentarios: undefined }));
  const ultima = cols.length > 1 ? cols[cols.length - 1].id : null;
  const abertas = itens.filter((c) => !ultima || c.etapa_id !== ultima);
  const valorAberto = abertas.reduce((s, c) => s + Number(c.valor || 0), 0);
  const valorFinal = itens.filter((c) => ultima && c.etapa_id === ultima).reduce((s, c) => s + Number(c.valor || 0), 0);
  const qtd = (id) => (contagem || []).filter((c) => c.pipeline_id === id).length;

  return (
    <>
      {topo}

      <nav className="segmentos" aria-label="Pipelines de compras" style={{ alignSelf: 'flex-start' }}>
        {lista.map((p) => (
          <Link key={p.id} href={`/financeiro/compras?p=${p.id}`} className={p.id === atual.id ? 'ativo' : ''}>
            {p.nome} ({qtd(p.id)})
          </Link>
        ))}
      </nav>

      <div className="grid-kpi">
        <div className="kpi"><span className="muted">Compras em aberto</span><span className="valor">{abertas.length}</span><span className="small muted">fora da última coluna</span></div>
        <div className="kpi"><span className="muted">Valor em aberto</span><span className="valor" style={{ fontSize: 26 }}>{fmtReal(valorAberto) || 'R$ 0,00'}</span><span className="small muted">soma dos valores preenchidos</span></div>
        <div className="kpi"><span className="muted">Já comprado</span><span className="valor" style={{ fontSize: 26 }}>{fmtReal(valorFinal) || 'R$ 0,00'}</span><span className="small muted">{ultima ? 'na coluna ' + cols[cols.length - 1].nome : 'última coluna'}</span></div>
      </div>

      <QuadroCompras
        key={atual.id}
        pipeline={atual}
        pipelines={lista}
        etapas={cols}
        compras={itens}
        eventos={eventos || []}
        equipe={equipe || []}
      />
    </>
  );
}
