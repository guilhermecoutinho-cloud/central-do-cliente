// Capa de um treinamento, no formato de pôster (estilo Netflix), com o check de concluído.

function fmtDia(iso) {
  if (!iso) return '';
  const [, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}`;
}

export default function CapaTreinamento({ t, feito = false, data, rotuloPendente = 'Ainda não fez' }) {
  const curto = String(t.sigla || '').length <= 3;
  return (
    <div className={'capa' + (feito ? ' feita' : ' pendente') + (t.capa_url ? ' com-imagem' : '')}>
      {t.capa_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.capa_url} alt={t.nome} loading="lazy" />
      ) : (
        <div className="capa-arte" aria-hidden="true">
          <span className="capa-marca">Capital Upgrade</span>
          <span className={'capa-sigla' + (curto ? '' : ' longa')}>{t.sigla}</span>
          {t.nome && t.nome !== t.sigla ? <span className="capa-nome">{t.nome}</span> : null}
          <span className="capa-faixa" />
        </div>
      )}
      {feito ? (
        <span className="capa-check" aria-label="Concluído">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </span>
      ) : null}
      <span className="capa-rodape">{feito ? 'Concluído' + (data ? ' em ' + fmtDia(data) : '') : rotuloPendente}</span>
    </div>
  );
}
