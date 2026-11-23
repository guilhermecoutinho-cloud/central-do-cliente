import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getPerfil } from '@/lib/perfil';
import { createClient } from '@/lib/supabase/server';
import { googleConfigurado, urlLogin } from '@/lib/google';

export const dynamic = 'force-dynamic';

// Manda a pessoa para o login do Google (ela autoriza a Central a criar eventos na agenda dela)
export async function GET(request) {
  const origem = new URL(request.url).origin;
  const perfil = await getPerfil();
  if (!perfil || perfil.semEquipe) return NextResponse.redirect(origem + '/login');
  if (!googleConfigurado()) return NextResponse.redirect(origem + '/conta?google=sem-config');

  const { data } = await createClient().auth.getUser();
  const estado = randomBytes(18).toString('hex');
  const resposta = NextResponse.redirect(urlLogin({ origem, estado, email: data?.user?.email }));
  resposta.cookies.set('google_estado', estado, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 });
  return resposta;
}
