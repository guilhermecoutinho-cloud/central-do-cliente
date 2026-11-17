import { createClient } from '@/lib/supabase/server';
import SetorIcone from '@/components/SetorIcone';
import Organograma from '@/components/Organograma';

export default async function PaginaOrganograma() {
  const { data: pessoas, error } = await createClient()
    .from('rh_pessoas')
    .select('id, nome, cargo, area, gestor_id, email, telefone, admissao, ordem')
    .eq('ativo', true)
    .order('ordem')
    .order('nome');
  if (error) return <div className="aviso t-amber">Falta ativar o RH: rode o arquivo supabase/eventos-rh.sql no SQL Editor do Supabase.</div>;
  const lista = pessoas || [];
  const areas = new Set(lista.map((p) => p.area).filter(Boolean));

  return (
    <>
      <div className="topo">
        <div className="pilha-p">
          <span className="selo"><SetorIcone slug="rh" tamanho={24} />RH</span>
          <h1 className="titulo">Organograma</h1>
          <span className="small" style={{ color: 'var(--texto3)' }}>
            {lista.length} {lista.length === 1 ? 'pessoa' : 'pessoas'}
            {areas.size ? ` em ${areas.size} ${areas.size === 1 ? 'área' : 'áreas'}` : ''}. Clique em alguém para editar, ou no + para adicionar abaixo dela.
          </span>
        </div>
      </div>
      <Organograma pessoas={lista} />
    </>
  );
}
