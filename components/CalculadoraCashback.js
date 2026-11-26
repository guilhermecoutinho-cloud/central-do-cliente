'use client';

import { useState } from 'react';
import { fmtMoeda, lerValor, nivelDe } from '@/lib/cashback';

// Simula quanto o aluno ganha com indicações e quanto paga usando o saldo num produto.
export default function CalculadoraCashback({ saldo = 0, totalGanho = 0, fechadasSemCashback = 0, valorPorIndicacao = 500 }) {
  const [qtd, setQtd] = useState(String(fechadasSemCashback || 1));
  const [porIndicacao, setPorIndicacao] = useState(String(valorPorIndicacao));
  const [preco, setPreco] = useState('');

  const n = Math.max(0, parseInt(qtd, 10) || 0);
  const v = Math.max(0, lerValor(porIndicacao) || 0);
  const ganho = n * v;
  const saldoFinal = Number(saldo) + ganho;
  const p = Math.max(0, lerValor(preco) || 0);
  const desconto = Math.min(saldoFinal, p);
  const nivel = nivelDe(Number(totalGanho) + ganho);

  return (
    <div className="calc-cb">
      <div className="calc-cb-grade">
        <label className="campo">
          <span>Indicações que fecharam</span>
          <input type="number" min="0" step="1" inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value)} />
        </label>
        <label className="campo">
          <span>Cashback por indicação (R$)</span>
          <input inputMode="decimal" value={porIndicacao} onChange={(e) => setPorIndicacao(e.target.value)} />
        </label>
      </div>
      <div className="calc-cb-res">
        <span className="pilha-p" style={{ gap: 2 }}>
          <span className="small muted">Vai ganhar</span>
          <b style={{ color: 'var(--verde)' }}>{fmtMoeda(ganho)}</b>
        </span>
        <span className="pilha-p" style={{ gap: 2 }}>
          <span className="small muted">Saldo depois</span>
          <b>{fmtMoeda(saldoFinal)}</b>
        </span>
        <span className="pilha-p" style={{ gap: 2 }}>
          <span className="small muted">Nível</span>
          <b className={'t-' + nivel.atual.cor} style={{ background: 'none' }}>{nivel.atual.nome}</b>
        </span>
      </div>
      <label className="campo">
        <span>Usar o saldo num produto: preço (R$)</span>
        <input inputMode="decimal" placeholder="Ex.: 12.000" value={preco} onChange={(e) => setPreco(e.target.value)} />
      </label>
      {p ? (
        <div className="calc-cb-res">
          <span className="pilha-p" style={{ gap: 2 }}>
            <span className="small muted">Desconto com cashback</span>
            <b style={{ color: 'var(--verde)' }}>− {fmtMoeda(desconto)}</b>
          </span>
          <span className="pilha-p" style={{ gap: 2 }}>
            <span className="small muted">Ele paga</span>
            <b>{fmtMoeda(p - desconto)}</b>
          </span>
          <span className="pilha-p" style={{ gap: 2 }}>
            <span className="small muted">Sobra de saldo</span>
            <b>{fmtMoeda(saldoFinal - desconto)}</b>
          </span>
        </div>
      ) : null}
    </div>
  );
}
