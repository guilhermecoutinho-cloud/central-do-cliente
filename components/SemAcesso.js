import Link from 'next/link';

export default function SemAcesso({ setor }) {
  return (
    <section className="card" style={{ maxWidth: 560 }}>
      <h1 className="h2">Você não tem acesso a {setor}</h1>
      <p className="muted" style={{ margin: 0 }}>Peça ao administrador para liberar este setor para você na tela Início.</p>
      <Link href="/" className="btn btn-sec" style={{ alignSelf: 'flex-start' }}>Voltar ao início</Link>
    </section>
  );
}
