'use client';

import { useRef, useState, useTransition } from 'react';
import { lancarCashback } from '@/app/actions';
import { COR_CATEGORIA, MOTIVOS, fmtMoeda } from '@/lib/cashback';

export default function FormCashback({ clienteId, saldo }) {
  const [tipo, setTipo] = useState('credito');
  const [categoria, setCategoria] = useState(MOTIVOS[0].categoria);
  const [valor, setValor] = useState(String(MOTIVOS[0].valor));
  const [motivo, setMotivo] = useState(MOTIVOS[0].desc);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [salvando, iniciar] = useTransition();
  const form = useRef(null);

  function escolher(m) {
    setCategoria(m.categoria);
    setValor(m.valor ? String(m.valor) : '');
    setMotivo(m.categoria === 'Outro' ? '' : m.desc);
  }

  function enviar(e) {
    e.preventDefault();
    setErro('');
    setOk('');
    const fd = new FormData(e.currentTarget);
    fd.set('tipo', tipo);
    fd.set('categoria', categoria);
    iniciar(async () => {
      try {
        await lancarCashback(fd);
        setOk(tipo === 'resgate' ? 'Resgate registrado.' : 'Cashback lançado.');
        if (tipo === 'resgate') setValor('');
      } catch (err) {
        setErro(err?.message || 'Não foi possível salvar.');
      }
    });
  }

  return (
    <form ref={form} onSubmit={enviar} className="card">
      <input type="hidden" name="cliente_id" value={clienteId} />
      <div className="entre">
        <h2 className="h2">Lançar</h2>
        <div className="segmentos" role="group" aria-label="Tipo de lançamento">
          <a href="#" onClick={(e) => { e.preventDefault(); setTipo('credito'); }} className={tipo === 'credito' ? 'ativo' : ''} aria-pressed={tipo === 'credito'}>Dar cashback</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setTipo('resgate'); setValor(''); setMotivo(''); }} className={tipo === 'resgate' ? 'ativo' : ''} aria-pressed={tipo === 'resgate'}>Resgatar</a>
        </div>
      </div>

      {tipo === 'credito' ? (
        <div className="linha" style={{ gap: 8 }} role="group" aria-label="Motivo">
          {MOTIVOS.map((m) => (
            <button
              key={m.categoria}
              type="button"
              onClick={() => escolher(m)}
              className={'pill ' + (categoria === m.categoria ? 't-' + COR_CATEGORIA[m.categoria] : 't-gray')}
              style={{ border: categoria === m.categoria ? '1px solid currentColor' : '1px solid transparent', cursor: 'pointer', padding: '8px 12px', minHeight: 36 }}
              aria-pressed={categoria === m.categoria}
            >
              {m.categoria}
            </button>
          ))}
        </div>
      ) : (
        <span className="muted">Saldo disponível para resgate: <strong style={{ color: 'var(--texto)' }}>{fmtMoeda(saldo)}</strong></span>
      )}

      <div className="form-grid">
        <div className="campo">
          <label htmlFor="cb-valor">Valor (R$) *</label>
          <input id="cb-valor" name="valor" inputMode="decimal" required value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex.: 150,00" />
        </div>
        <div className="campo">
          <label htmlFor="cb-autor">Quem lançou</label>
          <input id="cb-autor" name="autor" />
        </div>
        <div className="campo inteiro">
          <label htmlFor="cb-motivo">{tipo === 'resgate' ? 'Usou em quê' : 'Motivo'}</label>
          <input id="cb-motivo" name="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={tipo === 'resgate' ? 'Ex.: Desconto na renovação' : ''} />
        </div>
      </div>

      {erro ? <div className="aviso t-coral">{erro}</div> : null}
      {ok ? <div className="aviso t-green">{ok}</div> : null}
      <button type="submit" className="btn" disabled={salvando} style={{ alignSelf: 'flex-start' }}>
        {salvando ? 'Salvando...' : tipo === 'resgate' ? 'Registrar resgate' : 'Lançar cashback'}
      </button>
    </form>
  );
}
