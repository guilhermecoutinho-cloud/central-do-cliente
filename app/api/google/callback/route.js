import { NextResponse } from 'next/server';
import { getPerfil } from '@/lib/perfil';
import { clienteServico } from '@/lib/supabase/servico';
import { emailDaEmpresa, revogar, sincronizarPessoa, trocarCodigo } from '@/lib/google';
import { hojeISO } from '@/lib/tarefas';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// O Google devolve a pessoa para cá depois que ela autorizou
export async function GET(request) {
  const url = new URL(request.url);
  const origem = url.origin;
  const voltar = (q) => {
    const r = NextResponse.redirect(`${origem}/conta?google=${q}`);
    r.cookies.delete('google_estado');
    return r;
  };

  const perfil = await getPerfil();
  if (!perfil || perfil.semEquipe) return NextResponse.redirect(origem + '/login');
  if (url.searchParams.get('error')) return voltar('cancelado');
  const estado = request.cookies.get('google_estado')?.value;
  if (!estado || estado !== url.searchParams.get('state')) return voltar('expirou');

  const sb = clienteServico();
  if (!sb) return voltar('sem-servico');

  let t;
  try {
    t = await trocarCodigo(url.searchParams.get('code') || '', origem);
  } catch (e) {
    console.error('[google] troca do código:', e);
    return voltar('erro');
  }
  if (!emailDaEmpresa(t.email)) {
    await revogar(t.refresh_token || t.access_token);
    return voltar('outro-dominio');
  }
  if (!t.refresh_token) return voltar('sem-refresh');

  const { error } = await sb.from('google_contas').upsert({
    user_id: perfil.id,
    email: t.email,
    refresh_token: t.refresh_token,
    access_token: t.access_token,
    expira_em: new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString(),
    conectado_em: new Date().toISOString(),
    ultimo_erro: null,
  });
  if (error) {
    console.error('[google] gravar conta:', error);
    return voltar(/google_contas/.test(error.message) ? 'sem-sql' : 'erro');
  }

  // Já coloca na agenda as tarefas abertas com prazo de hoje em diante
  const r = await sincronizarPessoa(sb, perfil.id, origem, hojeISO()).catch(() => ({ ok: 0 }));
  return voltar('ok&n=' + (r.ok || 0));
}
