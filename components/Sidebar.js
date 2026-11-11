'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icone from './Icone';
import { sair } from '@/app/login/actions';

const LINKS = [
  { href: '/', nome: 'Painel geral', icone: 'painel' },
  { href: '/onboarding', nome: 'Onboarding', icone: 'check' },
  { href: '/encontros', nome: 'Encontros e presença', icone: 'calendario' },
  { href: '/assessment', nome: 'Assessment', icone: 'assessment' },
  { href: '/cashback', nome: 'Cashback', icone: 'cashback' },
];

export default function Sidebar({ usuario }) {
  const path = usePathname();
  const [aberto, setAberto] = useState(false);
  const ativo = (href) => (href === '/' ? path === '/' : path.startsWith(href));

  // No celular, fecha o menu sempre que muda de página.
  useEffect(() => setAberto(false), [path]);

  return (
    <nav className={'sidebar' + (aberto ? ' aberto' : '')} aria-label="Menu principal">
      <div className="sidebar-topo">
        <Link href="/" aria-label="Painel geral">
          <img src="/logo-caup.png" alt="Capital Upgrade Campinas" className="logo" width="172" height="48" />
        </Link>
        <button
          type="button"
          className="menu-botao"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-controls="menu-links"
          aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
        >
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {aberto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      <div className="sidebar-links" id="menu-links">
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
      </div>
    </nav>
  );
}
