// Aparece na hora em que você clica num link, enquanto os dados carregam.
export default function Carregando() {
  return (
    <div className="pilha" style={{ gap: 20 }} aria-busy="true" aria-label="Carregando">
      <div className="esqueleto" style={{ width: 220, height: 14 }} />
      <div className="esqueleto" style={{ width: 320, maxWidth: '80%', height: 34 }} />
      <div className="grid-kpi">
        <div className="esqueleto" style={{ height: 120, borderRadius: 18 }} />
        <div className="esqueleto" style={{ height: 120, borderRadius: 18 }} />
        <div className="esqueleto" style={{ height: 120, borderRadius: 18 }} />
      </div>
      <div className="esqueleto" style={{ height: 320, borderRadius: 18 }} />
    </div>
  );
}
