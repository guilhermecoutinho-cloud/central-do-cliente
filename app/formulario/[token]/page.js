import { createClient } from '@/lib/supabase/server';
import { CAMPOS_FORMULARIO } from '@/lib/formulario';
import { enviarFormulario } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Formulário de entrada · Capital Upgrade' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Formulario({ params, searchParams }) {
  const token = params.token;
  let cliente = null;
  if (UUID.test(token)) {
    const supabase = createClient();
    const { data } = await supabase.rpc('formulario_cliente', { p_token: token });
    cliente = Array.isArray(data) ? data[0] : data;
  }

  return (
    <div className="publico">
      <div className="caixa anim">
        <img src="/logo-caup.png" alt="Capital Upgrade Campinas" className="logo" />
        {!cliente ? (
          <div className="card">
            <h1 className="h2">Link inválido</h1>
            <p className="muted" style={{ margin: 0 }}>Peça um novo link ao time da Capital Upgrade.</p>
          </div>
        ) : searchParams?.ok ? (
          <div className="card">
            <h1 className="titulo-m">Recebemos, obrigado!</h1>
            <p className="muted" style={{ margin: 0 }}>Suas respostas já estão com o time da Capital Upgrade.</p>
          </div>
        ) : (
          <>
            <div className="pilha-p">
              <span className="muted">{cliente.empresa}</span>
              <h1 className="titulo-m">Formulário de entrada</h1>
              <span style={{ color: 'var(--texto3)' }}>
                Ele nos ajuda a conhecer a sua empresa e a conectar você com outros mentorados.
                {cliente.ja_respondido ? ' Você já respondeu antes; se enviar de novo, as respostas serão atualizadas.' : ''}
              </span>
            </div>
            <form action={enviarFormulario} className="card">
              <input type="hidden" name="token" value={token} />
              {CAMPOS_FORMULARIO.map((f) => (
                <div key={f.k} className="campo">
                  <label htmlFor={f.k} style={{ color: 'var(--texto)', fontSize: 14 }}>{f.label}{f.obrigatorio ? ' *' : ''}</label>
                  {f.tipo === 'textarea' ? (
                    <textarea id={f.k} name={f.k} required={!!f.obrigatorio} />
                  ) : (
                    <input id={f.k} name={f.k} type={f.tipo} required={!!f.obrigatorio} />
                  )}
                </div>
              ))}
              {searchParams?.erro ? <div className="aviso t-coral">Não foi possível enviar. Tente de novo.</div> : null}
              <button type="submit" className="btn">Enviar</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
