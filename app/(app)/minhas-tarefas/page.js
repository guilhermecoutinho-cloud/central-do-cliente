import { createClient } from '@/lib/supabase/server';
import { getPerfil } from '@/lib/perfil';
import { hojeISO, somarDias } from '@/lib/tarefas';
import MinhasLista from '@/components/tarefas/MinhasLista';

export default async function MinhasTarefas() {
  const perfil = await getPerfil();
  const hoje = hojeISO();

  let tarefas = [];
  if (!perfil.semMigracao) {
    const supabase = createClient();
    // Abertas + concluídas nos últimos 7 dias
    const { data, error } = await supabase
      .from('tarefas')
      .select('id, titulo, setor, status, prazo, concluida_em')
      .eq('responsavel', perfil.id)
      .or(`status.neq.Feito,concluida_em.gte.${somarDias(hoje, -7)}`)
      .order('prazo', { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    tarefas = data || [];
  }

  return (
    <>
      <div className="topo anim">
        <div>
          <span className="eyebrow">Tudo que está com você, de todos os setores</span>
          <h1 className="titulo">Minhas tarefas</h1>
        </div>
      </div>
      <MinhasLista tarefas={tarefas} hoje={hoje} />
    </>
  );
}
