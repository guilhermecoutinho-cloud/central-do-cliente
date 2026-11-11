import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { usuarioId } from '@/lib/supabase/usuario';
import Sidebar from '@/components/Sidebar';
import { sair } from '@/app/login/actions';

export const dynamic = 'force-dynamic';

function Aviso({ titulo, children }) {
  return (
    <div className="publico" style={{ alignItems: 'center' }}>
      <div className="caixa" style={{ maxWidth: 520 }}>
        <img src="/logo-caup.png" alt="Capital Upgrade Campinas" className="logo" width="180" height="50" />
        <div className="card">
          <h1 className="h2">{titulo}</h1>
          {children}
          <form action={sair}>
            <button type="submit" className="btn btn-sec">Sair</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default async function AppLayout({ children }) {
  const supabase = createClient();
  const id = await usuarioId(supabase);
  if (!id) redirect('/login');

  const { data: membro, error } = await supabase.from('equipe').select('nome, papel').eq('user_id', id).maybeSingle();

  if (error) {
    return (
      <Aviso titulo="O banco ainda não está pronto">
        <p className="muted" style={{ margin: 0 }}>Rode o arquivo supabase/schema.sql no SQL Editor do Supabase e recarregue a página.</p>
        <span className="small muted">Detalhe técnico: {error.message}</span>
      </Aviso>
    );
  }

  if (!membro) {
    return (
      <Aviso titulo="Seu usuário ainda não foi liberado">
        <p className="muted" style={{ margin: 0 }}>
          Você entrou, mas ainda não está na equipe da Central do Cliente. Peça ao administrador para liberar o seu acesso.
        </p>
      </Aviso>
    );
  }

  return (
    <div className="app">
      <Sidebar usuario={membro.nome} />
      <main className="conteudo">{children}</main>
    </div>
  );
}
