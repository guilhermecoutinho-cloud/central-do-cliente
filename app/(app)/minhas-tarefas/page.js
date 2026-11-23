import { createClient } from '@/lib/supabase/server';
import { getPerfil } from '@/lib/perfil';
import { hojeISO, somarDias } from '@/lib/tarefas';
import MinhasLista from '@/components/tarefas/MinhasLista';
import { googleConfigurado } from '@/lib/google';

export default async function MinhasTarefas() {
  const perfil = await getPerfil();
  const hoje = hojeISO();

  let tarefas = [];
  let convidarGoogle = false;
  if (!perfil.semMigracao) {
    const supabase = createClient();
    if (googleConfigurado()) {
      const { data: g, error: eg } = await supabase.rpc('minha_conta_google');
      convidarGoogle = !eg && !(g || []).length;
    }
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
      {convidarGoogle ? (
        <div className="aviso t-gray entre" style={{ flexWrap: 'wrap', gap: 10 }}>
          <span>Quer ver suas tarefas na Google Agenda? Conecte sua conta e cada tarefa com prazo vira um evento no dia.</span>
          <a href="/api/google/conectar" className="btn btn-sec" style={{ padding: '8px 14px' }}>Conectar Google Agenda</a>
        </div>
      ) : null}
      <MinhasLista tarefas={tarefas} hoje={hoje} />
    </>
  );
}
