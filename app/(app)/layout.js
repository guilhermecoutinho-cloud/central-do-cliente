import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/Sidebar';
import { sair } from '@/app/login/actions';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: membro } = await supabase.from('equipe').select('nome, papel').eq('user_id', user.id).maybeSingle();

  if (!membro) {
    return (
      <div className="publico" style={{ alignItems: 'center' }}>
        <div className="caixa" style={{ maxWidth: 480 }}>
          <img src="/logo-caup.png" alt="Capital Upgrade Campinas" className="logo" />
          <div className="card">
            <h1 className="h2">Seu usuário ainda não foi liberado</h1>
            <p className="muted" style={{ margin: 0 }}>
              Você entrou como {user.email}, mas ainda não está na equipe da Central do Cliente. Peça ao administrador para liberar o seu acesso.
            </p>
            <form action={sair}>
              <button type="submit" className="btn btn-sec">Sair</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar usuario={membro.nome} />
      <main className="conteudo">{children}</main>
    </div>
  );
}
