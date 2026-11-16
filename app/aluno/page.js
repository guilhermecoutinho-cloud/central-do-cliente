import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { usuarioId } from '@/lib/supabase/usuario';
import { sair } from '@/app/login/actions';
import CapaTreinamento from '@/components/CapaTreinamento';
import TrocarSenha from '@/components/TrocarSenha';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Área do aluno · Capital Upgrade' };

function saudacao() {
  const h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

// Área do aluno: os treinamentos da Capital Upgrade em capas, com o check do que já fez.
export default async function AreaDoAluno() {
  const supabase = createClient();
  const id = await usuarioId(supabase);
  if (!id) redirect('/login');

  const { data: cadastro } = await supabase.rpc('meu_cadastro_aluno');
  const eu = Array.isArray(cadastro) ? cadastro[0] : cadastro;

  if (!eu) {
    // Quem é do time vai para a Central
    const { data: time } = await supabase.from('equipe').select('user_id').eq('user_id', id).maybeSingle();
    if (time) redirect('/');
    return (
      <div className="publico" style={{ alignItems: 'center' }}>
        <div className="caixa" style={{ maxWidth: 480 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-caup.png" alt="Capital Upgrade Campinas" className="logo" width="180" height="50" />
          <div className="card">
            <h1 className="h2">Seu acesso ainda não foi liberado</h1>
            <p className="muted" style={{ margin: 0 }}>Fale com o time de Sucesso do Cliente da Capital Upgrade.</p>
            <form action={sair}><button type="submit" className="btn btn-sec">Sair</button></form>
          </div>
        </div>
      </div>
    );
  }

  const [{ data: treinamentos }, { data: checks }] = await Promise.all([
    supabase.from('treinamentos').select('id, sigla, nome, descricao, capa_url, ordem').eq('ativo', true).order('ordem'),
    supabase.from('aluno_treinamentos').select('treinamento_id, concluido_em'),
  ]);
  const feito = Object.fromEntries((checks || []).map((c) => [c.treinamento_id, c.concluido_em]));
  const lista = treinamentos || [];
  const concluidos = lista.filter((t) => feito[t.id]);
  const proximos = lista.filter((t) => !feito[t.id]);
  const pct = lista.length ? Math.round((concluidos.length / lista.length) * 100) : 0;
  const primeiroNome = String(eu.nome || '').split(' ')[0];

  return (
    <div className="aluno-pagina">
      <header className="aluno-topo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-caup.png" alt="Capital Upgrade Campinas" width="150" height="42" className="aluno-logo" />
        <div className="linha" style={{ gap: 16 }}>
          <TrocarSenha />
          <form action={sair}><button type="submit" className="btn btn-sec btn-p">Sair</button></form>
        </div>
      </header>

      <main className="aluno-conteudo">
        <section className="pilha" style={{ gap: 10 }}>
          <span className="eyebrow muted">{eu.empresa}</span>
          <h1 className="titulo">{saudacao()}, {primeiroNome}</h1>
          <div className="pilha-p" style={{ gap: 8, maxWidth: 520 }}>
            <span style={{ color: 'var(--texto3)' }}>
              Você concluiu <b style={{ color: 'var(--texto)' }}>{concluidos.length} de {lista.length}</b> treinamentos da Capital Upgrade.
            </span>
            <div className="barra"><span style={{ width: pct + '%', background: 'var(--verde)' }} /></div>
          </div>
        </section>

        {concluidos.length ? (
          <section className="pilha" style={{ gap: 14 }}>
            <h2 className="h2">Seus treinamentos</h2>
            <div className="capas grandes">
              {concluidos.map((t) => (
                <div key={t.id} className="pilha-p" style={{ gap: 8 }}>
                  <CapaTreinamento t={t} feito data={feito[t.id]} />
                  {t.descricao ? <span className="small muted">{t.descricao}</span> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {proximos.length ? (
          <section className="pilha" style={{ gap: 14 }}>
            <h2 className="h2">{concluidos.length ? 'Próximos passos' : 'Treinamentos da Capital Upgrade'}</h2>
            <div className="capas grandes">
              {proximos.map((t) => (
                <div key={t.id} className="pilha-p" style={{ gap: 8 }}>
                  <CapaTreinamento t={t} rotuloPendente="Ainda não fez" />
                  {t.descricao ? <span className="small muted">{t.descricao}</span> : null}
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="aviso t-green">Você já fez todos os treinamentos da Capital Upgrade. Parabéns!</div>
        )}
      </main>
    </div>
  );
}
