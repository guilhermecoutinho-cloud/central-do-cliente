'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icone from './Icone';
import { sair } from '@/app/login/actions';

const LINKS = [
  { href: '/', nome: 'Painel geral', icone: 'painel' },
  { href: '/onboarding', nome: 'Onboarding', icone: 'check' },
  { href: '/encontros', nome: 'Encontros e presença', icone: 'calendario' },
  { href: '/assessment', nome: 'Assessment', icone: 'assessment' },
];

export default function Sidebar({ usuario }) {
  const path = usePathname();
  const ativo = (href) => (href === '/' ? path === '/' : path.startsWith(href));

  return (
    <nav className="sidebar" aria-label="Menu principal">
      <img src="/logo-caup.png" alt="Capital Upgrade Campinas" className="logo" />
      <span className="sub">CENTRAL DO CLIENTE</span>
      <span className="secao">VISÃO DO TIME</span>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={'nav-a' + (ativo(l.href) ? ' ativo' : '')}>
          <Icone nome={l.icone} />
          {l.nome}
        </Link>
      ))}
      <span className="nav-off">
        Eventos
        <span className="pill t-gray" style={{ fontSize: 11 }}>depois</span>
      </span>
      <span className="secao">CLIENTES</span>
      <Link href="/clientes/novo" className={'nav-a' + (path === '/clientes/novo' ? ' ativo' : '')}>
        <Icone nome="mais" />
        Novo cliente
      </Link>
      <div className="rodape">
        <span className="small" style={{ fontWeight: 600 }}>{usuario}</span>
        <form action={sair}>
          <button type="submit" className="btn-link">Sair</button>
        </form>
      </div>
    </nav>
  );
}
