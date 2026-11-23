import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './config';

// Cliente com a chave de serviço (ignora as permissões). Só no servidor.
export function clienteServico() {
  const chave = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!chave) return null;
  return createClient(SUPABASE_URL, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}
