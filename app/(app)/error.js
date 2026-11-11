'use client';

export default function Erro({ error, reset }) {
  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h1 className="h2">Algo deu errado</h1>
      <p className="muted" style={{ margin: 0 }}>{error?.message || 'Tente de novo em alguns segundos.'}</p>
      <button type="button" className="btn btn-sec" onClick={() => reset()} style={{ alignSelf: 'flex-start' }}>
        Tentar de novo
      </button>
    </div>
  );
}
