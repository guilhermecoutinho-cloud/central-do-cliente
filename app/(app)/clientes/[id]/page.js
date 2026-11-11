import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resumoEncontros } from '@/lib/encontros';
import { COR_PRODUTO, STATUS, corAvatar, iniciais } from '@/lib/util';
import AbaGeral from './abas/Geral';
import AbaOnboarding from './abas/Onboarding';
import AbaTime from './abas/Time';
import AbaEncontros from './abas/Encontros';
import AbaDossie from './abas/Dossie';
import AbaAcompanhamentos from './abas/Acompanhamentos';

const ABAS = [
  ['geral', 'Visão geral'],
  ['onboarding', 'Onboarding'],
  ['time', 'Time'],
  ['encontros', 'Encontros'],
  ['dossie', 'Dossiê'],
  ['acompanhamentos', 'Acompanhamentos'],
];

export default async function FichaCliente({ params, searchParams }) {
  const aba = ABAS.some(([k]) => k === searchParams?.aba) ? searchParams.aba : 'geral';
  const supabase = createClient();
  const { data: c, error } = await supabase.from('clientes').select('*').eq('id', params.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!c) notFound();

  const [{ data: membros }, { data: encontros }, { data: tarefas }, { data: acomps }] = await Promise.all([
    supabase.from('membros').select('*').eq('cliente_id', c.id).order('criado_em'),
    supabase.from('encontros').select('*').eq('produto', c.produto).order('data'),
    supabase.from('onboarding_tarefas').select('chave').eq('cliente_id', c.id),
    supabase
      .from('acompanhamentos')
      .select('*')
      .eq('cliente_id', c.id)
      .order('data', { ascending: false })
      .order('criado_em', { ascending: false }),
  ]);

  const { data: presencaCliente } = await supabase.from('presenca_cliente').select('encontro_id, cliente_id, presente').eq('cliente_id', c.id);

  const r = resumoEncontros(c, encontros || [], presencaCliente || []);
  const feitas = new Set((tarefas || []).map((t) => t.chave));
  const st = STATUS[c.status] || STATUS.onboarding;
  const props = { c, r, membros: membros || [], feitas, acomps: acomps || [], searchParams: searchParams || {} };

  return (
    <>
      <div className="topo anim">
        <div className="linha" style={{ gap: 18, flexWrap: 'nowrap' }}>
          <span className={'av av-g t-' + corAvatar(c.id)}>{iniciais(c.nome)}</span>
          <div className="pilha-p">
            <Link href="/" className="small">Painel geral</Link>
            <h1 className="titulo-m">{c.nome} · {c.empresa}</h1>
            <div className="linha" style={{ gap: 8 }}>
              <span className={'pill t-' + COR_PRODUTO[c.produto]}>{c.produto}</span>
              <span className={'pill t-' + st.cor}>{st.nome}</span>
              <span className="pill t-gray">Responsável: {c.responsavel || '—'}</span>
              {c.substituto ? <span className="pill t-gray">Substituto: {c.substituto}</span> : null}
            </div>
          </div>
        </div>
      </div>

      <nav className="abas anim anim-1" aria-label="Abas do cliente">
        {ABAS.map(([k, nome]) => (
          <Link key={k} href={`/clientes/${c.id}?aba=${k}`} className={aba === k ? 'ativo' : ''}>
            {nome}
          </Link>
        ))}
      </nav>

      <div className="anim anim-2" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {aba === 'geral' && <AbaGeral {...props} />}
        {aba === 'onboarding' && <AbaOnboarding {...props} />}
        {aba === 'time' && <AbaTime {...props} />}
        {aba === 'encontros' && <AbaEncontros {...props} />}
        {aba === 'dossie' && <AbaDossie {...props} />}
        {aba === 'acompanhamentos' && <AbaAcompanhamentos {...props} />}
      </div>
    </>
  );
}
