'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icone from './Icone';
import { sair } from '@/app/login/actions';
import { NAV_SUCESSO, ROTAS_SUCESSO, SETORES } from '@/lib/setores';
import { iniciais } from '@/lib/util';

function setorAtivo(path) {
  if (ROTAS_SUCESSO.some((r) => path === r || path.startsWith(r + '/'))) return 'sucesso';
  const m = path.match(/^\/setor\/([^/]+)/);
  return m ? m[1] : null;
}

export default function Sidebar({ nome, admin, setores, atrasadas }) {
  const path = usePathname();
  const [aberto, setAberto] = useState(false);
  const atual = setorAtivo(path);
  const pode = (slug) => admin || setores.includes(slug);

  // No celular, fecha o menu sempre que muda de página.
  useEffect(() => setAberto(false), [path]);

  return (
    <nav className={'sidebar' + (aberto ? ' aberto' : '')} aria-label="Menu principal">
      <div className="sidebar-topo">
        <Link href="/" aria-label="Início">
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
        <span className="sub">CENTRAL DA EMPRESA</span>
        <Link href="/" className={'nav-a' + (path === '/' ? ' ativo' : '')}>
          <Icone nome="painel" />
          Início
        </Link>
        <Link href="/minhas-tarefas" className={'nav-a' + (path === '/minhas-tarefas' ? ' ativo' : '')} style={{ justifyContent: 'space-between' }}>
          <span className="linha" style={{ gap: 10, flexWrap: 'nowrap' }}>
            <Icone nome="check" />
            Minhas tarefas
          </span>
          {atrasadas > 0 ? <span className="pill t-coral" title="Atrasadas">{atrasadas}</span> : null}
        </Link>

        <span className="secao">SETORES</span>
        {SETORES.map((s) => {
          const tem = pode(s.slug);
          const ativo = atual === s.slug;
          if (!tem) {
            return (
              <span key={s.slug} className="nav-off" title="Sem acesso">
                <span className="linha" style={{ gap: 10, flexWrap: 'nowrap' }}>
                  <span className="sigla t-gray">{s.sigla}</span>
                  {s.nome}
                </span>
                <svg aria-label="Sem acesso" role="img" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              </span>
            );
          }
          const href = s.slug === 'sucesso' ? '/sucesso' : `/setor/${s.slug}`;
          return (
            <div key={s.slug} className="pilha-p" style={{ gap: 2 }}>
              <Link href={href} className={'nav-a tom-' + s.cor + (ativo ? ' ativo' : '')}>
                <span className={'sigla t-' + s.cor}>{s.sigla}</span>
                {s.nome}
              </Link>
              {ativo ? (
                <div className={'subnav tom-' + s.cor}>
                  {s.slug === 'sucesso' ? (
                    NAV_SUCESSO.map((n) => {
                      const sel = path === n.href || (n.href !== '/sucesso' && path.startsWith(n.href + '/')) || (n.href === '/sucesso' && path.startsWith('/clientes/') && path !== '/clientes/novo');
                      return (
                        <Link key={n.href} href={n.href} className={sel ? 'ativo' : ''}>
                          {n.nome}
                        </Link>
                      );
                    })
                  ) : (
                    <>
                      <Link href={href} className="ativo">Tarefas</Link>
                      <span className="em-breve">Painel (em breve)</span>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}

        <div className="rodape" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <span className="av t-green" style={{ width: 32, height: 32 }}>{iniciais(nome)}</span>
          <span className="pilha-p" style={{ gap: 2, flex: 1, minWidth: 0 }}>
            <span className="small" style={{ fontWeight: 600 }}>{nome}</span>
            <span className="small muted">{admin ? 'Administrador' : 'Equipe'}</span>
          </span>
          <form action={sair}>
            <button type="submit" className="btn-link">Sair</button>
          </form>
        </div>
      </div>
    </nav>
  );
}
