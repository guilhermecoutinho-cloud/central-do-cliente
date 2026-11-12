'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { criarClienteMatricula } from '@/app/actions';
import { CAMPOS_MATRICULA, lerMatricula } from '@/lib/matricula';
import { PRODUTOS } from '@/lib/util';

const MODELO = `Dados para matricula

NOME COMPLETO:
DATA DE NASCIMENTO:
EMPRESA:
CPF:
RG:
E-MAIL:
CELULAR:
ENDEREÇO:
BAIRRO:
CIDADE:
ESTADO:
CEP:`;

function BotaoCriar({ desabilitado }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={desabilitado || pending} style={{ alignSelf: 'flex-start' }}>
      {pending ? 'Criando o cliente…' : 'Criar cliente e abrir o onboarding'}
    </button>
  );
}

// Cola o bloco "Dados para matrícula" e os campos se preenchem na hora.
export default function ColarMatricula() {
  const [texto, setTexto] = useState('');
  const [dados, setDados] = useState({});
  const [info, setInfo] = useState(null);

  function colar(v) {
    setTexto(v);
    if (!v.trim()) {
      setDados({});
      setInfo(null);
      return;
    }
    const r = lerMatricula(v);
    setDados(r.dados);
    setInfo(r);
  }

  const lido = info && info.encontrados > 0;

  return (
    <form action={criarClienteMatricula} className="card" style={{ maxWidth: 900 }}>
      <div className="pilha-p">
        <h2 className="h2">Colar dados para matrícula</h2>
        <span className="small muted">Cole a mensagem com os dados do cliente. Os campos se preenchem sozinhos e você só escolhe o produto.</span>
      </div>

      <textarea
        className="input"
        value={texto}
        onChange={(e) => colar(e.target.value)}
        placeholder={MODELO}
        rows={lido ? 4 : 13}
        style={{ resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit', transition: 'height .2s' }}
        aria-label="Dados para matrícula"
        autoFocus
      />

      {info && !lido ? (
        <div className="aviso t-amber">Não encontrei os campos. Confira se o texto está no formato "NOME COMPLETO: ...", um campo por linha.</div>
      ) : null}

      {lido ? (
        <>
          <div className="entre">
            <span className="small" style={{ color: 'var(--texto3)' }}>
              {info.encontrados} de {CAMPOS_MATRICULA.length} campos lidos. Confira e ajuste se precisar.
            </span>
            {info.faltando.length ? <span className="small muted">Faltando: {info.faltando.join(', ')}</span> : null}
          </div>
          {info.nascimentoNaoEntendido ? (
            <div className="aviso t-amber">Não entendi a data de nascimento "{info.nascimentoNaoEntendido}". Preencha no campo abaixo.</div>
          ) : null}

          <div className="form-grid anim">
            {CAMPOS_MATRICULA.map((c) => (
              <div key={c.chave} className={'campo' + (c.largo ? ' inteiro' : '')}>
                <label htmlFor={'m-' + c.chave}>{c.rotulo}{c.obrigatorio ? ' *' : ''}</label>
                <input
                  id={'m-' + c.chave}
                  name={c.chave}
                  type={c.tipo || 'text'}
                  required={!!c.obrigatorio}
                  value={dados[c.chave] || ''}
                  onChange={(e) => setDados({ ...dados, [c.chave]: e.target.value })}
                  style={c.tipo === 'date' ? { colorScheme: 'dark' } : undefined}
                />
              </div>
            ))}
          </div>

          <h2 className="h2" style={{ marginTop: 4 }}>Produto e contrato</h2>
          <div className="form-grid">
            <div className="campo">
              <label htmlFor="m-produto">Produto *</label>
              <select id="m-produto" name="produto" required defaultValue="">
                <option value="" disabled>Escolha</option>
                {PRODUTOS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="campo"><label htmlFor="m-ini">Data de início (contrato assinado)</label><input id="m-ini" name="data_inicio" type="date" style={{ colorScheme: 'dark' }} /></div>
            <div className="campo"><label htmlFor="m-enc">Encontros contratados</label><input id="m-enc" name="encontros_contratados" type="number" min="0" defaultValue="0" /></div>
            <div className="campo"><label htmlFor="m-resp">Responsável pelo onboarding</label><input id="m-resp" name="responsavel" placeholder="Tati" /></div>
            <div className="campo"><label htmlFor="m-closer">Quem vendeu</label><input id="m-closer" name="closer" /></div>
          </div>

          <BotaoCriar desabilitado={!dados.nome || !dados.empresa} />
        </>
      ) : null}
    </form>
  );
}
