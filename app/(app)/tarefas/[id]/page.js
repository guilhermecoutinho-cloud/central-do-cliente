import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPerfil } from '@/lib/perfil';
import { setorPorSlug } from '@/lib/setores';
import { hojeISO } from '@/lib/tarefas';
import TarefaEditor from '@/components/tarefas/TarefaEditor';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TarefaPagina({ params }) {
  if (!UUID.test(params.id)) notFound();
  const perfil = await getPerfil();
  const supabase = createClient();
  const id = params.id;

  const [{ data: t }, { data: subtarefas }, { data: atualizacoes }, { data: atividade }, { data: equipe }] = await Promise.all([
    supabase.from('tarefas').select('*').eq('id', id).maybeSingle(),
    supabase.from('tarefa_subtarefas').select('id, texto, feito').eq('tarefa_id', id).order('criado_em'),
    supabase.from('tarefa_atualizacoes').select('*').eq('tarefa_id', id).order('criado_em', { ascending: false }),
    supabase.from('tarefa_atividade').select('*').eq('tarefa_id', id).order('criado_em', { ascending: false }).limit(30),
    supabase.from('equipe').select('user_id, nome').order('nome'),
  ]);
  // Sem acesso ao setor, o banco não devolve a tarefa: tratamos como "não encontrada".
  if (!t) notFound();

  const { data: grupos } = await supabase.from('tarefa_grupos').select('id, nome').eq('setor', t.setor).order('ordem');
  const setor = setorPorSlug(t.setor);

  return (
    <TarefaEditor
      tarefa={{ ...t, setorNome: setor?.nome || t.setor }}
      subtarefas={subtarefas || []}
      atualizacoes={atualizacoes || []}
      atividade={atividade || []}
      grupos={grupos || []}
      equipe={equipe || []}
      hoje={hojeISO()}
      eu={perfil?.id}
    />
  );
}
