'use server';

import { createClient } from '@/lib/supabase/server';

// Marca que a pessoa já viu as tarefas novas que chegaram para ela
export async function marcarTarefasVistas() {
  const { error } = await createClient().rpc('marcar_tarefas_vistas');
  if (error && !/marcar_tarefas_vistas/.test(error.message)) throw new Error(error.message);
}
