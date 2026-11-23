import { NextResponse } from 'next/server';
import { clienteServico } from '@/lib/supabase/servico';
import { apagarEvento, googleConfigurado, sincronizarTarefa } from '@/lib/google';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// O banco (Supabase) avisa aqui quando uma tarefa é criada, muda ou é apagada.
// Ele manda um segredo que só o banco e a Central conhecem (tabela google_config).
export async function POST(request) {
  const corpo = await request.json().catch(() => null);
  const sb = clienteServico();
  if (!corpo || !sb || !googleConfigurado()) return NextResponse.json({ ok: false }, { status: 200 });

  const { data: cfg } = await sb.from('google_config').select('segredo, url_app').eq('id', 1).maybeSingle();
  if (!cfg?.segredo || corpo.segredo !== cfg.segredo) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    if (corpo.acao === 'apagar') {
      await apagarEvento(sb, corpo.usuario, corpo.evento);
      return NextResponse.json({ ok: true });
    }
    if (corpo.acao === 'sincronizar' && corpo.tarefa) {
      const r = await sincronizarTarefa(sb, corpo.tarefa, cfg.url_app);
      return NextResponse.json(r);
    }
  } catch (e) {
    console.error('[google] sync:', e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
  return NextResponse.json({ ok: false });
}
