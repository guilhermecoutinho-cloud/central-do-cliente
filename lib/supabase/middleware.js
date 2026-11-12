import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { SUPABASE_KEY, SUPABASE_URL, configurado } from './config';
import { usuarioId } from './usuario';

// Páginas que abrem sem login (o QR do assessment e o formulário do cliente).
// /api/claude confere a própria chave secreta (conector do Claude).
// /.well-known, /register, /authorize e /token: o Claude procura um login (OAuth) nesses endereços
// ao adicionar o conector. Eles precisam responder 404 (não existe login), e não redirecionar
// para a tela de login da Central, senão o Claude acha que precisa se registrar e dá erro.
const PUBLICAS = ['/login', '/responder', '/formulario', '/configuracao', '/api/claude', '/.well-known', '/register', '/authorize', '/token'];

export async function updateSession(request) {
  const path = request.nextUrl.pathname;
  const publica = PUBLICAS.some((p) => path === p || path.startsWith(p + '/'));

  // Sem as chaves do Supabase: manda para a página que explica o que falta.
  if (!configurado) {
    if (path === '/configuracao') return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = '/configuracao';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Páginas públicas não precisam conferir login: carregam mais rápido no celular do cliente.
  if (publica) return NextResponse.next();

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    const id = await usuarioId(supabase);
    if (!id) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '';
      return NextResponse.redirect(url);
    }
  } catch (err) {
    // Se o Supabase não responder, segue: as páginas internas também conferem o login.
    console.error('Falha ao verificar a sessão no middleware:', err);
  }

  return response;
}
