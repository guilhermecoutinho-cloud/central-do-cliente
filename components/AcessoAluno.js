'use client';

import { useState, useTransition } from 'react';
import { criarAcessoAluno, removerAcessoAluno } from '@/app/actions-aluno';
import CopiarTexto from './CopiarTexto';

// Cria (ou refaz) o login da pessoa na Área do aluno e mostra a senha uma única vez.
export default function AcessoAluno({ clienteId, membro, site }) {
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');
  const [pendente, iniciar] = useTransition();
  const temAcesso = !!membro.user_id || !!resultado;
  const email = membro.email || membro.email_celular;

  function criar() {
    setErro('');
    iniciar(async () => {
      try {
        setResultado(await criarAcessoAluno({ cliente_id: clienteId, membro_id: membro.id }));
      } catch (e) {
        setErro(e?.message || 'Não foi possível criar o acesso.');
      }
    });
  }

  function remover() {
    if (!window.confirm(`Tirar o acesso de ${membro.nome} à área do aluno?`)) return;
    setErro('');
    iniciar(async () => {
      try {
        await removerAcessoAluno({ cliente_id: clienteId, membro_id: membro.id });
        setResultado(null);
      } catch (e) {
        setErro(e?.message || 'Não foi possível remover o acesso.');
      }
    });
  }

  const primeiroNome = String(membro.nome || '').split(' ')[0];
  const mensagem = resultado
    ? `Olá, ${primeiroNome}! Seu acesso à Área do Aluno da Capital Upgrade está pronto.\n\nSite: ${site}/login\nE-mail: ${resultado.email}\nSenha: ${resultado.senha}\n\nLá você vê seus treinamentos e o que já concluiu. Depois de entrar, você pode trocar a senha.`
    : '';

  return (
    <div className="pilha-p" style={{ gap: 8 }}>
      <div className="linha" style={{ gap: 10 }}>
        <span className={'pill ' + (temAcesso ? 't-green' : 't-gray')}>{temAcesso ? 'Tem acesso à área do aluno' : 'Sem acesso à área do aluno'}</span>
        {email ? (
          <>
            <button type="button" className="btn-link" onClick={criar} disabled={pendente}>
              {pendente ? 'Aguarde…' : temAcesso ? 'Gerar senha nova' : 'Criar acesso do aluno'}
            </button>
            {temAcesso ? <button type="button" className="btn-perigo" onClick={remover} disabled={pendente}>Tirar acesso</button> : null}
          </>
        ) : (
          <span className="small muted">Cadastre o e-mail na aba Time para criar o acesso.</span>
        )}
      </div>
      {resultado ? (
        <div className="card-2 pilha-p" style={{ gap: 6 }}>
          <span className="small muted">Login {resultado.nova ? 'criado' : 'atualizado'}. A senha aparece só agora:</span>
          <span className="small" style={{ color: 'var(--texto2)' }}>{resultado.email}</span>
          <span className="senha-gerada">{resultado.senha}</span>
          <CopiarTexto texto={mensagem} rotulo="Copiar mensagem para mandar no WhatsApp" />
        </div>
      ) : null}
      {erro ? <span className="small" style={{ color: 'var(--coral)' }}>{erro}</span> : null}
    </div>
  );
}
