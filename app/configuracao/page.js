import { redirect } from 'next/navigation';
import { SUPABASE_KEY, SUPABASE_URL, configurado } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Configuração · Central do Cliente' };

export default function Configuracao() {
  if (configurado) redirect('/login');

  const temUrl = /^https:\/\/.+/.test(SUPABASE_URL);
  const temChave = SUPABASE_KEY.length > 20;

  return (
    <div className="publico" style={{ alignItems: 'center' }}>
      <div className="caixa" style={{ maxWidth: 560 }}>
        <img src="/logo-caup.png" alt="Capital Upgrade Campinas" className="logo" width="180" height="50" />
        <div className="card">
          <h1 className="h2">Falta conectar o Supabase</h1>
          <p className="muted" style={{ margin: 0 }}>O site está no ar, mas as chaves do banco não chegaram neste deploy.</p>
          <div className="pilha" style={{ gap: 8 }}>
            <span className="linha"><span className={'pill ' + (temUrl ? 't-green' : 't-coral')}>{temUrl ? 'OK' : 'Faltando'}</span> NEXT_PUBLIC_SUPABASE_URL</span>
            <span className="linha"><span className={'pill ' + (temChave ? 't-green' : 't-coral')}>{temChave ? 'OK' : 'Faltando'}</span> NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, color: 'var(--texto3)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Na Vercel, abra o projeto → Settings → Environment Variables.</li>
            <li>Cadastre as duas variáveis com os valores do Supabase (Project Settings → API), marcando Production, Preview e Development.</li>
            <li>Vá em Deployments, abra o último deploy e clique em Redeploy. Sem o Redeploy as chaves não entram.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
