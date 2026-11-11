'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CAMPOS_FORMULARIO } from '@/lib/formulario';

export async function enviarFormulario(formData) {
  const token = String(formData.get('token') || '');
  const dados = {};
  for (const f of CAMPOS_FORMULARIO) {
    dados[f.k] = String(formData.get(f.k) || '').trim().slice(0, 5000);
  }
  const supabase = createClient();
  const { error } = await supabase.rpc('salvar_formulario', { p_token: token, p_dados: dados });
  if (error) redirect(`/formulario/${token}?erro=1`);
  redirect(`/formulario/${token}?ok=1`);
}
