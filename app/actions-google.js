'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getPerfil } from '@/lib/perfil';
import { clienteServico } from '@/lib/supabase/servico';
import { revogar, sincronizarPessoa } from '@/lib/google';
import { hojeISO } from '@/lib/tarefas';

function origem() {
  const h = headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  return host ? `https://${host}` : '';
}

// Tira a conexão: a Central para de mexer na agenda (os eventos que já estão lá ficam)
export async function desconectarGoogle() {
  const perfil = await getPerfil();
  if (!perfil) throw new Error('Entre de novo na Central.');
  const sb = clienteServico();
  if (!sb) throw new Error('Falta a SUPABASE_SERVICE_ROLE_KEY na Vercel.');
  const { data: conta } = await sb.from('google_contas').select('refresh_token').eq('user_id', perfil.id).maybeSingle();
  if (conta) await revogar(conta.refresh_token);
  await sb.from('tarefas').update({ google_evento_id: null, google_user: null }).eq('google_user', perfil.id);
  await sb.from('google_contas').delete().eq('user_id', perfil.id);
  revalidatePath('/conta');
}

// Coloca de novo na agenda as tarefas abertas com prazo de hoje em diante
export async function sincronizarAgora() {
  const perfil = await getPerfil();
  if (!perfil) return { erro: 'Entre de novo na Central.' };
  const sb = clienteServico();
  if (!sb) return { erro: 'Falta a SUPABASE_SERVICE_ROLE_KEY na Vercel.' };
  try {
    const r = await sincronizarPessoa(sb, perfil.id, origem(), hojeISO(), 100);
    revalidatePath('/conta');
    return r;
  } catch (e) {
    return { erro: 'Não foi possível sincronizar: ' + (e?.message || 'erro inesperado') };
  }
}
