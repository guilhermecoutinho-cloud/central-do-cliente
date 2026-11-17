'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { marcarTarefasVistas } from '@/app/actions-avisos';
import { CHAVE_MUDO, tocarSom } from './LembreteTarefas';

const SOM_NOVA = [[660, 0], [880, 0.12], [1320, 0.24]]; // três notas subindo, diferente do lembrete de atraso
const NOME_SETOR = { sucesso: 'Sucesso do Cliente', marketing: 'Marketing', vendas: 'Vendas', eventos: 'Eventos', financeiro: 'Financeiro', rh: 'RH' };

const silenciado = () => {
  try {
    return window.localStorage.getItem(CHAVE_MUDO) === '1';
  } catch {
    return false;
  }
};

// Aviso de tarefa nova no seu nome:
// - ao abrir a Central, mostra as que chegaram enquanto você estava fora
// - com a Central aberta, avisa na hora (tempo real do Supabase)
export default function AvisoTarefaNova({ meuId, iniciais, nomes }) {
  const router = useRouter();
  const [novas, setNovas] = useState(iniciais || []);
  const [visivel, setVisivel] = useState(false);
  const [permissao, setPermissao] = useState('indisponivel');
  const vistas = useRef(new Set((iniciais || []).map((t) => t.id + (t.atribuido_em || ''))));
  const timer = useRef(null);

  function mostrar(tocar) {
    setVisivel(true);
    if (tocar && !silenciado()) tocarSom(SOM_NOVA);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisivel(false), 45000);
    marcarTarefasVistas().catch(() => {});
  }

  // Ao abrir a Central
  useEffect(() => {
    if ('Notification' in window) setPermissao(Notification.permission);
    if (iniciais?.length) mostrar(true);
    return () => clearTimeout(timer.current);
    // Só ao abrir (o layout não remonta ao trocar de página)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Em tempo real
  useEffect(() => {
    if (!meuId) return undefined;
    const supabase = createClient();
    const canal = supabase
      .channel('tarefas-novas-' + meuId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas', filter: `responsavel=eq.${meuId}` }, ({ new: t }) => {
        if (!t?.id || !t.atribuido_em || t.atribuido_por === meuId || t.status === 'Feito') return;
        if (Date.now() - new Date(t.atribuido_em).getTime() > 2 * 60 * 1000) return; // só o que acabou de chegar
        const chave = t.id + t.atribuido_em;
        if (vistas.current.has(chave)) return;
        vistas.current.add(chave);
        setNovas((l) => [t, ...l.filter((x) => x.id !== t.id)].slice(0, 20));
        mostrar(true);
        router.refresh();
        // Se a aba estiver em segundo plano, também avisa pelo computador (quando a pessoa permitiu)
        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          try {
            const quem = t.atribuido_por ? nomes?.[t.atribuido_por] : null;
            new Notification('Tarefa nova para você', { body: t.titulo + (quem ? ` · de ${quem}` : ''), tag: 'tarefa-' + t.id });
          } catch {}
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meuId]);

  async function pedirPermissao() {
    try {
      setPermissao(await Notification.requestPermission());
    } catch {}
  }

  function fechar() {
    setVisivel(false);
    setNovas([]);
  }

  if (!visivel || !novas.length) return null;
  const mostradas = novas.slice(0, 3);
  const resto = novas.length - mostradas.length;

  return (
    <div className="lembrete aviso-nova" role="status" aria-live="polite">
      <span className="lembrete-icone" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M9 12h6M12 9v6" />
        </svg>
      </span>
      <div className="pilha-p" style={{ gap: 8, minWidth: 0, flex: 1 }}>
        <span style={{ fontWeight: 600 }}>
          {novas.length === 1 ? 'Tarefa nova para você' : `${novas.length} tarefas novas para você`}
        </span>
        <ul className="aviso-nova-lista">
          {mostradas.map((t) => {
            const quem = t.atribuido_por ? nomes?.[t.atribuido_por]?.split(' ')[0] : null;
            return (
              <li key={t.id}>
                <span className="aviso-nova-titulo">{t.titulo}</span>
                <span className="small muted">
                  {[NOME_SETOR[t.setor] || t.setor, quem ? `de ${quem}` : null, t.prazo ? `prazo ${t.prazo.split('-').reverse().slice(0, 2).join('/')}` : null].filter(Boolean).join(' · ')}
                </span>
              </li>
            );
          })}
        </ul>
        {resto > 0 ? <span className="small muted">e mais {resto}</span> : null}
        <span className="linha" style={{ gap: 14, flexWrap: 'wrap' }}>
          <Link href="/minhas-tarefas" className="small" style={{ fontWeight: 600 }} onClick={fechar}>Ver minhas tarefas</Link>
          {permissao === 'default' ? (
            <button type="button" className="btn-link small" style={{ color: 'var(--muted)' }} onClick={pedirPermissao}>
              Avisar também quando eu estiver em outra aba
            </button>
          ) : null}
        </span>
      </div>
      <button type="button" className="lembrete-fechar" onClick={fechar} aria-label="Fechar aviso">×</button>
    </div>
  );
}
