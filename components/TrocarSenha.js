'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// O aluno troca a própria senha.
export default function TrocarSenha() {
  const [aberto, setAberto] = useState(false);
  const [msg, setMsg] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const senha = String(f.get('senha') || '');
    if (senha.length < 8) return setMsg({ erro: true, texto: 'Use pelo menos 8 caracteres.' });
    if (senha !== String(f.get('confirma') || '')) return setMsg({ erro: true, texto: 'As duas senhas não são iguais.' });
    setEnviando(true);
    const { error } = await createClient().auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) setMsg({ erro: true, texto: 'Não foi possível trocar a senha: ' + error.message });
    else {
      setMsg({ erro: false, texto: 'Senha trocada.' });
      e.target.reset();
      setTimeout(() => setAberto(false), 1500);
    }
  }

  if (!aberto) {
    return <button type="button" className="btn-link" onClick={() => { setAberto(true); setMsg(null); }}>Trocar senha</button>;
  }
  return (
    <form onSubmit={salvar} className="card" style={{ maxWidth: 420, width: '100%' }}>
      <h2 className="h2">Trocar senha</h2>
      <div className="campo"><label htmlFor="nova">Nova senha</label><input id="nova" name="senha" type="password" autoComplete="new-password" required /></div>
      <div className="campo"><label htmlFor="conf">Repita a nova senha</label><input id="conf" name="confirma" type="password" autoComplete="new-password" required /></div>
      {msg ? <div className={'aviso ' + (msg.erro ? 't-coral' : 't-green')}>{msg.texto}</div> : null}
      <div className="linha">
        <button type="submit" className="btn" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar'}</button>
        <button type="button" className="btn btn-sec" onClick={() => setAberto(false)}>Cancelar</button>
      </div>
    </form>
  );
}
