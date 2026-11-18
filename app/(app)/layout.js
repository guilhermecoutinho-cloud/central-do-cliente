import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { hojeISO, somarDias as somarDiasISO } from '@/lib/tarefas';
import Sidebar from '@/components/Sidebar';
import LembreteTarefas from '@/components/LembreteTarefas';
import AvisoTarefaNova from '@/components/AvisoTarefaNova';
import AvisoConteudoHoje from '@/components/AvisoConteudoHoje';
import { sair } from '@/app/login/actions';

export const dynamic = 'force-dynamic';
// A IA (Gemini) pode levar alguns segundos: dá até 60s para as ações responderem
export const maxDuration = 60;

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
  let tarefasNovas = [];
  let conteudoHoje = [];
  let conteudoPendente = 0;
  const nomesEquipe = {};
  if (!perfil.semMigracao) {
    const supabase = createClient();
    const hoje = hojeISO();
    const base = () => supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('responsavel', perfil.id).neq('status', 'Feito');
    const [{ count: a }, { count: h }] = await Promise.all([base().lt('prazo', hoje), base().eq('prazo', hoje)]);
    atrasadas = a || 0;
    vencemHoje = h || 0;

    // Tarefas que alguém colocou no meu nome desde a última vez que vi (precisa do aviso-tarefas.sql)
    const { data: eu } = await supabase.from('equipe').select('tarefas_vistas_em').eq('user_id', perfil.id).maybeSingle();
    if (eu?.tarefas_vistas_em) {
      const { data: chegaram } = await supabase
        .from('tarefas')
        .select('id, titulo, setor, prazo, atribuido_em, atribuido_por')
        .eq('responsavel', perfil.id)
        .neq('status', 'Feito')
        .gt('atribuido_em', eu.tarefas_vistas_em)
        .or(`atribuido_por.is.null,atribuido_por.neq.${perfil.id}`)
        .order('atribuido_em', { ascending: false })
        .limit(20);
      tarefasNovas = chegaram || [];
      if (tarefasNovas.length) {
        const ids = [...new Set(tarefasNovas.map((t) => t.atribuido_por).filter(Boolean))];
        if (ids.length) {
          const { data: pessoas } = await supabase.from('equipe').select('user_id, nome').in('user_id', ids);
          for (const p of pessoas || []) nomesEquipe[p.user_id] = p.nome;
        }
      }
    }
  }

  // Marketing: "hoje tem conteúdo" do calendário de social mídia (precisa do calendario-conteudo.sql)
  if (!perfil.semMigracao && podeSetor(perfil, 'marketing')) {
    const supabase = createClient();
    const hoje = hojeISO();
    const [{ data: deHoje }, { count: pend }] = await Promise.all([
      supabase
        .from('conteudo_posts')
        .select('id, descricao, campanha, formato, data, data_fim')
        .eq('feito', false)
        .lte('data', hoje)
        .or(`data.eq.${hoje},data_fim.gte.${hoje}`)
        .order('ordem')
        .limit(10),
      supabase
        .from('conteudo_posts')
        .select('id', { count: 'exact', head: true })
        .eq('feito', false)
        .lt('data', hoje)
        .gte('data', somarDiasISO(hoje, -14))
        .or(`data_fim.is.null,data_fim.lt.${hoje}`),
    ]);
    conteudoHoje = deHoje || [];
    conteudoPendente = pend || 0;
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
      <div className="avisos-canto">
        <AvisoTarefaNova meuId={perfil.semMigracao ? null : perfil.id} iniciais={tarefasNovas} nomes={nomesEquipe} />
        <AvisoConteudoHoje hoje={hojeISO()} posts={conteudoHoje} pendentes={conteudoPendente} />
        <LembreteTarefas atrasadas={atrasadas} hoje={vencemHoje} />
      </div>
    </div>
  );
}
