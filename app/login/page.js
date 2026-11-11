import { entrar } from './actions';

export const metadata = { title: 'Entrar · Central do Cliente' };

export default function Login({ searchParams }) {
  const erro = searchParams?.erro;
  return (
    <div className="publico" style={{ alignItems: 'center' }}>
      <div className="caixa anim" style={{ maxWidth: 420 }}>
        <img src="/logo-caup.png" alt="Capital Upgrade Campinas" className="logo" />
        <div className="pilha-p">
          <span className="muted">Central do Cliente</span>
          <h1 className="titulo-m">Entrar</h1>
        </div>
        <form action={entrar} className="card">
          <div className="campo">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="campo">
            <label htmlFor="senha">Senha</label>
            <input id="senha" name="senha" type="password" required autoComplete="current-password" />
          </div>
          {erro ? (
            <div className="aviso t-coral">E-mail ou senha incorretos.</div>
          ) : null}
          <button type="submit" className="btn">Entrar</button>
        </form>
        <span className="small muted">Acesso só para o time da Capital Upgrade. Peça seu usuário ao administrador.</span>
      </div>
    </div>
  );
}
