import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { SETORES } from '@/lib/setores';
import { atrasada, hojeISO } from '@/lib/tarefas';
import { fmtDataHora } from '@/lib/util';
import AcessoMatriz from '@/components/AcessoMatriz';
import Icone from '@/components/Icone';

function saudacao() {
  const h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default async function Inicio() {
  const perfil = await getPerfil();
  const supabase = createClient();
  const hoje = hojeISO();
  const temSucesso = podeSetor(perfil, 'sucesso');

  const consultas = [
    perfil.semMigracao ? Promise.resolve({ data: [] }) : supabase.from('tarefas').select('setor, status, prazo, responsavel'),
    temSucesso ? supabase.from('encontros').select('produto, titulo, data').gt('data', new Date().toISOString()).order('data').limit(1) : Promise.resolve({ data: [] }),
    perfil.admin && !perfil.semMigracao ? supabase.from('equipe').select('user_id, nome, papel').order('nome') : Promise.resolve({ data: [] }),
    perfil.admin && !perfil.semMigracao ? supabase.from('equipe_setores').select('user_id, setor') : Promise.resolve({ data: [] }),
  ];
  const [{ data: tarefas }, { data: proximos }, { data: pessoas }, { data: acessos }] = await Promise.all(consultas);

  const lista = tarefas || [];
  const minhas = lista.filter((t) => t.responsavel === perfil.id && t.status !== 'Feito');
  const minhasAtrasadas = minhas.filter((t) => atrasada(t, hoje)).length;
  const minhasHoje = minhas.filter((t) => t.prazo === hoje).length;
  const proximo = (proximos || [])[0];
  const mapaAcessos = Object.fromEntries((acessos || []).map((a) => [a.user_id + ':' + a.setor, true]));
  const primeiroNome = (perfil.nome || '').split(' ')[0];

  return (
    <>
      <div className="topo anim">
        <div>
          <span className="eyebrow" style={{ textTransform: 'capitalize' }}>
            {new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h1 className="titulo">{saudacao()}, {primeiroNome}</h1>
        </div>
        <div className="linha">
          {perfil.admin ? <Link href="/lideranca" className="btn btn-sec">Visão da liderança</Link> : null}
          <Link href="/minhas-tarefas" className="btn">Ver minhas tarefas</Link>
        </div>
      </div>

      <div className="grid-kpi anim anim-1">
        <Link href="/minhas-tarefas" className="kpi tom-blue" style={{ color: 'var(--texto)' }}>
          <span className="icone"><Icone nome="check" tamanho={20} /></span>
          <span className="muted">Minhas tarefas abertas</span>
          <span className="valor">{minhas.length}</span>
        </Link>
        <Link href="/minhas-tarefas" className="kpi tom-coral" style={{ color: 'var(--texto)' }}>
          <span className="icone"><Icone nome="relogio" tamanho={20} /></span>
          <span className="muted">Atrasadas</span>
          <span className={'valor' + (minhasAtrasadas ? ' cor' : '')}>{minhasAtrasadas}</span>
        </Link>
        <Link href="/minhas-tarefas" className="kpi tom-amber" style={{ color: 'var(--texto)' }}>
          <span className="icone"><Icone nome="calendario" tamanho={20} /></span>
          <span className="muted">Vencem hoje</span>
          <span className="valor">{minhasHoje}</span>
        </Link>
        {temSucesso ? (
          <Link href="/encontros" className="kpi tom-violet" style={{ color: 'var(--texto)' }}>
            <span className="icone"><Icone nome="pessoas" tamanho={20} /></span>
            <span className="muted">Próximo encontro</span>
            <span className="valor" style={{ fontSize: 22 }}>{proximo ? fmtDataHora(proximo.data) : 'Sem data'}</span>
            <span className="small muted">{proximo ? `${proximo.produto} · ${proximo.titulo}` : 'Cadastre em Encontros'}</span>
          </Link>
        ) : null}
      </div>

      <section className="pilha anim anim-2">
        <h2 className="h2">Setores</h2>
        <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))' }}>
          {SETORES.map((s) => {
            const tem = podeSetor(perfil, s.slug);
            const doSetor = lista.filter((t) => t.setor === s.slug && t.status !== 'Feito');
            const atr = doSetor.filter((t) => atrasada(t, hoje)).length;
            const href = s.slug === 'sucesso' ? '/sucesso' : `/setor/${s.slug}/painel`;
            const conteudo = (
              <>
                <span className="entre" style={{ gap: 10 }}>
                  <span className={'sigla t-' + s.cor} style={{ width: 38, height: 38, flexBasis: 38, borderRadius: 11, fontSize: 13 }}>{s.sigla}</span>
                  <span className={'pill ' + (tem ? 't-green' : 't-gray')}>{tem ? 'Com acesso' : 'Sem acesso'}</span>
                </span>
                <span style={{ fontSize: 17, fontWeight: 700 }}>{s.nome}</span>
                <span className="small muted" style={{ lineHeight: 1.45 }}>{s.desc}</span>
                {tem ? (
                  <span className="linha" style={{ gap: 8 }}>
                    <span className="pill t-gray">{doSetor.length} {doSetor.length === 1 ? 'tarefa aberta' : 'tarefas abertas'}</span>
                    {atr ? <span className="pill t-coral">{atr} {atr === 1 ? 'atrasada' : 'atrasadas'}</span> : null}
                  </span>
                ) : (
                  <span className="small muted">Peça acesso ao administrador.</span>
                )}
              </>
            );
            return tem ? (
              <Link key={s.slug} href={href} className={'card faixa tom-' + s.cor} style={{ color: 'var(--texto)', gap: 10 }}>{conteudo}</Link>
            ) : (
              <div key={s.slug} className="card" style={{ gap: 10, opacity: 0.55 }}>{conteudo}</div>
            );
          })}
        </div>
      </section>

      {perfil.admin && !perfil.semMigracao ? <AcessoMatriz pessoas={pessoas || []} acessos={mapaAcessos} /> : null}
    </>
  );
}
