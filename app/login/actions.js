'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function entrar(formData) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email') || '').trim(),
    password: String(formData.get('senha') || ''),
  });
  if (error) redirect('/login?erro=1');
  redirect('/');
}

export async function sair() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
