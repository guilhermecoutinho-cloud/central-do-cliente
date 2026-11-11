import { createClient } from '@/lib/supabase/server';
import { enviarAssessment } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Assessment · Capital Upgrade' };

export default async function Responder({ searchParams }) {
  const ok = searchParams?.ok;
  const erro = searchParams?.erro;
  const supabase = createClient();
  const { data: perguntas } = await supabase.from('assessment_perguntas').select('id, texto').eq('ativa', true).order('ordem');

  return (
    <div className="publico">
      <div className="caixa anim">
        <img src="/logo-caup.png" alt="Capital Upgrade Campinas" className="logo" />
        {ok ? (
          <div className="card">
            <h1 className="titulo-m">Obrigado!</h1>
            <p className="muted" style={{ margin: 0 }}>Suas respostas foram enviadas para o time da Capital Upgrade.</p>
          </div>
        ) : (
          <>
            <div className="pilha-p">
              <span className="muted">Capital Upgrade</span>
              <h1 className="titulo-m">Assessment</h1>
              <span style={{ color: 'var(--texto3)' }}>Use o mesmo e-mail ou telefone que você passou no cadastro. Assim a sua resposta entra no seu nome.</span>
            </div>
            <form action={enviarAssessment} className="card">
              <div className="campo"><label htmlFor="nome">Seu nome completo *</label><input id="nome" name="nome" required autoComplete="name" /></div>
              <div className="campo"><label htmlFor="contato">E-mail ou telefone do cadastro *</label><input id="contato" name="contato" required /></div>
              {(perguntas || []).map((p, i) => (
                <div key={p.id} className="campo">
                  <label htmlFor={'q_' + p.id} style={{ color: 'var(--texto)', fontSize: 14 }}>{i + 1}. {p.texto}</label>
                  <textarea id={'q_' + p.id} name={'q_' + p.id} />
                </div>
              ))}
              {erro ? <div className="aviso t-coral">{erro === 'campos' ? 'Preencha seu nome e o e-mail ou telefone.' : 'Não foi possível enviar. Tente de novo.'}</div> : null}
              <button type="submit" className="btn">Enviar respostas</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
