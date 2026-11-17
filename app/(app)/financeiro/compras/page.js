import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { hojeISO } from '@/lib/tarefas';
import { fmtReal } from '@/lib/compras';
import QuadroCompras from '@/components/QuadroCompras';
import SetorIcone from '@/components/SetorIcone';
import SemAcesso from '@/components/SemAcesso';

export default async function Compras({ searchParams }) {
  const perfil = await getPerfil();
  if (!podeSetor(perfil, 'financeiro')) return <SemAcesso setor="Financeiro" />;

  const supabase = createClient();
  const [{ data: todas, error }, { data: eventos }, { data: equipe }] = await Promise.all([
    supabase
      .from('compras')
      .select('id, titulo, descricao, quantidade, valor, fornecedor, evento_id, etapa, responsavel, prazo, ordem, criado_por, criado_em, compra_comentarios(count)')
      .order('criado_em', { ascending: false }),
    supabase.from('eventos').select('id, nome, data_inicio, data_fim').order('data_inicio', { ascending: true, nullsFirst: false }),
    supabase.from('equipe').select('user_id, nome').order('nome'),
  ]);
  if (error) {
    return <div className="aviso t-amber">Falta ativar as compras: rode os arquivos supabase/eventos-rh.sql e supabase/financeiro-compras.sql no SQL Editor do Supabase.</div>;
  }

  const lista = (todas || []).map((c) => ({ ...c, comentarios: c.compra_comentarios?.[0]?.count || 0, compra_comentarios: undefined }));
  const hoje = hojeISO();
  // Abas: eventos que têm compras ou que ainda vão acontecer
  const evs = (eventos || []).filter((e) => lista.some((c) => c.evento_id === e.id) || !e.data_inicio || (e.data_fim || e.data_inicio) >= hoje);
  const filtro = searchParams?.evento === 'geral' ? 'geral' : evs.some((e) => e.id === searchParams?.evento) ? searchParams.evento : null;
  const doFiltro = filtro === 'geral' ? lista.filter((c) => !c.evento_id) : filtro ? lista.filter((c) => c.evento_id === filtro) : lista;

  const abertas = doFiltro.filter((c) => c.etapa !== 'finalizado');
  const valorAberto = abertas.reduce((s, c) => s + Number(c.valor || 0), 0);
  const valorFinal = doFiltro.filter((c) => c.etapa === 'finalizado').reduce((s, c) => s + Number(c.valor || 0), 0);
  const contar = (id) => (id === 'geral' ? lista.filter((c) => !c.evento_id).length : lista.filter((c) => c.evento_id === id).length);

  return (
    <>
      <div className="topo">
        <div className="pilha-p">
          <span className="selo"><SetorIcone slug="financeiro" tamanho={24} />Financeiro</span>
          <h1 className="titulo">Compras</h1>
          <span className="small" style={{ color: 'var(--texto3)' }}>Separadas por evento. O que não é de evento fica em CAUP geral.</span>
        </div>
      </div>

      <nav className="segmentos" aria-label="Compras por evento" style={{ alignSelf: 'flex-start' }}>
        <Link href="/financeiro/compras" className={!filtro ? 'ativo' : ''}>Todas ({lista.length})</Link>
        <Link href="/financeiro/compras?evento=geral" className={filtro === 'geral' ? 'ativo' : ''}>CAUP geral ({contar('geral')})</Link>
        {evs.map((e) => (
          <Link key={e.id} href={`/financeiro/compras?evento=${e.id}`} className={filtro === e.id ? 'ativo' : ''}>{e.nome} ({contar(e.id)})</Link>
        ))}
      </nav>

      <div className="grid-kpi">
        <div className="kpi"><span className="muted">Compras em aberto</span><span className="valor">{abertas.length}</span><span className="small muted">ainda não finalizadas</span></div>
        <div className="kpi"><span className="muted">Valor em aberto</span><span className="valor" style={{ fontSize: 26 }}>{fmtReal(valorAberto) || 'R$ 0,00'}</span><span className="small muted">soma dos valores preenchidos</span></div>
        <div className="kpi"><span className="muted">Já comprado</span><span className="valor" style={{ fontSize: 26 }}>{fmtReal(valorFinal) || 'R$ 0,00'}</span><span className="small muted">compras finalizadas</span></div>
      </div>

      <QuadroCompras key={filtro || 'todas'} compras={doFiltro} eventos={eventos || []} equipe={equipe || []} eventoFiltro={filtro} />
    </>
  );
}
