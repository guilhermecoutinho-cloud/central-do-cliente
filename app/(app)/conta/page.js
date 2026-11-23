import { createClient } from '@/lib/supabase/server';
import { getPerfil } from '@/lib/perfil';
import { googleConfigurado } from '@/lib/google';
import { desconectarGoogle } from '@/app/actions-google';
import TrocarSenha from '@/components/TrocarSenha';
import BotaoConfirmar from '@/components/BotaoConfirmar';
import SincronizarGoogle from '@/components/SincronizarGoogle';

export const metadata = { title: 'Minha conta · Central da Empresa' };

const AVISOS = {
  ok: ['t-green', 'Google Agenda conectada.'],
  cancelado: ['t-amber', 'Você cancelou a conexão com o Google.'],
  expirou: ['t-amber', 'A conexão demorou demais. Clique em Conectar de novo.'],
  erro: ['t-coral', 'O Google não aceitou a conexão. Tente de novo; se continuar, avise o administrador.'],
  'sem-refresh': ['t-amber', 'O Google não liberou o acesso contínuo. Remova a Central em myaccount.google.com/permissions e conecte de novo.'],
  'outro-dominio': ['t-amber', 'Use a sua conta do Google da empresa (@capitalupgrade.com.br). Contas pessoais não podem ser conectadas.'],
  'sem-config': ['t-amber', 'A integração com o Google ainda não foi ligada pelo administrador.'],
  'sem-servico': ['t-coral', 'Falta a SUPABASE_SERVICE_ROLE_KEY na Vercel.'],
  'sem-sql': ['t-coral', 'Falta rodar o arquivo supabase/google-agenda.sql no Supabase.'],
};

export default async function Conta({ searchParams }) {
  const perfil = await getPerfil();
  const supabase = createClient();
  const [{ data: usuario }, { data: contas, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc('minha_conta_google'),
  ]);
  const conta = contas?.[0] || null;
  const semSql = Boolean(error);
  const ligado = googleConfigurado();
  const aviso = AVISOS[searchParams?.google];
  const sincronizadas = searchParams?.google === 'ok' ? Number(searchParams?.n || 0) : null;

  return (
    <>
      <div className="topo">
        <div>
          <span className="eyebrow">{usuario?.user?.email}</span>
          <h1 className="titulo">Minha conta</h1>
        </div>
      </div>

      {aviso ? (
        <div className={'aviso ' + aviso[0]} style={{ maxWidth: 760 }}>
          {aviso[1]}
          {sincronizadas !== null ? ` ${sincronizadas} ${sincronizadas === 1 ? 'tarefa entrou' : 'tarefas entraram'} na sua agenda.` : ''}
        </div>
      ) : null}

      <section className="card pilha" style={{ maxWidth: 760 }}>
        <div className="entre" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
          <div className="pilha-p" style={{ gap: 6 }}>
            <h2 className="h2">Google Agenda</h2>
            <span className="small" style={{ color: 'var(--texto3)', maxWidth: 520 }}>
              Toda tarefa no seu nome com prazo vira um evento de dia inteiro na sua agenda, no dia do prazo. Se o prazo, o nome ou o responsável mudar, a agenda acompanha; se a tarefa for apagada, o evento sai.
            </span>
          </div>
          {conta ? <span className="pill t-green">Conectada</span> : <span className="pill t-gray">Não conectada</span>}
        </div>

        {semSql ? (
          <div className="aviso t-amber">Falta ativar a integração: o administrador precisa rodar o arquivo supabase/google-agenda.sql no Supabase.</div>
        ) : !ligado ? (
          <div className="aviso t-amber">
            A integração com o Google ainda não foi ligada.{' '}
            {perfil.admin ? 'Falta colocar GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nas variáveis da Vercel.' : 'Avise o administrador.'}
          </div>
        ) : conta ? (
          <>
            <span className="small" style={{ color: 'var(--texto2)' }}>
              Conectada como <b>{conta.email || 'sua conta do Google'}</b> desde {new Date(conta.conectado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.
            </span>
            {conta.ultimo_erro ? <div className="aviso t-coral">{conta.ultimo_erro}</div> : null}
            <div className="linha" style={{ gap: 12, flexWrap: 'wrap' }}>
              <SincronizarGoogle />
              {conta.ultimo_erro ? <a className="btn" href="/api/google/conectar">Conectar de novo</a> : null}
              <form action={desconectarGoogle}>
                <BotaoConfirmar pergunta="Desconectar o Google Agenda? Os eventos que já estão na sua agenda continuam lá, mas a Central para de atualizar.">Desconectar</BotaoConfirmar>
              </form>
            </div>
          </>
        ) : (
          <div className="linha" style={{ gap: 12, flexWrap: 'wrap' }}>
            <a className="btn" href="/api/google/conectar">Conectar com o Google</a>
            <span className="small muted">Entre com o seu e-mail @capitalupgrade.com.br e autorize a Central a criar eventos na sua agenda.</span>
          </div>
        )}
      </section>

      <section className="card pilha" style={{ maxWidth: 760 }}>
        <h2 className="h2">Senha</h2>
        <TrocarSenha />
      </section>
    </>
  );
}
