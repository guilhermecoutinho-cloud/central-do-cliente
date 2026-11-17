import { createClient } from '@/lib/supabase/server';
import SetorIcone from '@/components/SetorIcone';
import Organograma from '@/components/Organograma';

export default async function PaginaOrganograma() {
  const supabase = createClient();
  const buscar = (campos) => supabase.from('rh_pessoas').select(campos).eq('ativo', true).order('ordem').order('nome');
  const base = 'id, nome, cargo, area, gestor_id, email, telefone, admissao, ordem';
  let { data: pessoas, error } = await buscar(base + ', pos_x, pos_y');
  let semPosicao = false;
  if (error) {
    // Ainda não rodou o rh-organograma.sql: funciona, só não guarda onde cada um foi arrastado
    ({ data: pessoas, error } = await buscar(base));
    semPosicao = !error;
  }
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
            {areas.size ? ` em ${areas.size} ${areas.size === 1 ? 'área' : 'áreas'}` : ''}. Arraste as pessoas livremente. Clique para editar e use o + para adicionar alguém abaixo.
          </span>
        </div>
      </div>
      {semPosicao ? <div className="aviso t-amber">Para o organograma guardar onde cada pessoa foi arrastada, rode o arquivo supabase/rh-organograma.sql no SQL Editor do Supabase.</div> : null}
      <Organograma pessoas={lista} />
    </>
  );
}
