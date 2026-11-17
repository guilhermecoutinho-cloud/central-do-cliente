import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPerfil } from '@/lib/perfil';
import { hojeISO } from '@/lib/tarefas';
import Sidebar from '@/components/Sidebar';
import LembreteTarefas from '@/components/LembreteTarefas';
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
  const perfil = await getPerfil();
  if (!perfil) redirect('/login');

  if (perfil.erro) {
    return (
      <Aviso titulo="O banco ainda não está pronto">
        <p className="muted" style={{ margin: 0 }}>Rode o arquivo supabase/schema.sql no SQL Editor do Supabase e recarregue a página.</p>
        <span className="small muted">Detalhe técnico: {perfil.erro}</span>
      </Aviso>
    );
  }

  if (perfil.semEquipe) {
    // Pessoa do time de um cliente (aluno): vai para a área do aluno
    const { data: aluno } = await createClient().from('membros').select('id').eq('user_id', perfil.id).maybeSingle();
    if (aluno) redirect('/aluno');
    return (
      <Aviso titulo="Seu usuário ainda não foi liberado">
        <p className="muted" style={{ margin: 0 }}>
          Você entrou, mas ainda não está na equipe da Central. Peça ao administrador para liberar o seu acesso.
        </p>
      </Aviso>
    );
  }

  // Minhas tarefas atrasadas (aparece no menu) e as que vencem hoje (aviso ao abrir a Central)
  let atrasadas = 0;
  let vencemHoje = 0;
  if (!perfil.semMigracao) {
    const supabase = createClient();
    const hoje = hojeISO();
    const base = () => supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('responsavel', perfil.id).neq('status', 'Feito');
    const [{ count: a }, { count: h }] = await Promise.all([base().lt('prazo', hoje), base().eq('prazo', hoje)]);
    atrasadas = a || 0;
    vencemHoje = h || 0;
  }

  return (
    <div className="app">
      <Sidebar nome={perfil.nome} admin={perfil.admin} setores={perfil.setores} atrasadas={atrasadas} />
      <main className="conteudo">
        {perfil.semMigracao ? (
          <div className="aviso t-amber">
            Falta ativar setores e tarefas: rode o arquivo supabase/central-empresa.sql no SQL Editor do Supabase.
          </div>
        ) : null}
        {children}
      </main>
      <LembreteTarefas atrasadas={atrasadas} hoje={vencemHoje} />
    </div>
  );
}
