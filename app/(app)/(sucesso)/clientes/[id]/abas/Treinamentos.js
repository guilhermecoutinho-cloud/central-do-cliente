import Link from 'next/link';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { corAvatar, iniciais } from '@/lib/util';
import CapaMarcavel from '@/components/CapaMarcavel';
import AcessoAluno from '@/components/AcessoAluno';

// Treinamentos de cada pessoa do time do cliente: capas com o check do que já fez.
export default async function AbaTreinamentos({ c, membros }) {
  const supabase = createClient();
  const ids = membros.map((m) => m.id);
  const [{ data: treinamentos, error }, { data: checks }] = await Promise.all([
    supabase.from('treinamentos').select('id, sigla, nome, capa_url, ordem').eq('ativo', true).order('ordem'),
    ids.length ? supabase.from('aluno_treinamentos').select('membro_id, treinamento_id, concluido_em').in('membro_id', ids) : Promise.resolve({ data: [] }),
  ]);

  if (error) {
    return (
      <div className="aviso t-amber">
        Falta ativar os treinamentos: rode o arquivo supabase/area-aluno.sql no SQL Editor do Supabase.
      </div>
    );
  }

  const h = headers();
  const site = `${h.get('x-forwarded-proto') || 'https'}://${h.get('x-forwarded-host') || h.get('host')}`;
  const feito = {};
  (checks || []).forEach((k) => (feito[k.membro_id + ':' + k.treinamento_id] = k.concluido_em));
  const lista = treinamentos || [];

  if (!membros.length) {
    return (
      <div className="vazio" style={{ padding: 28, fontSize: 14 }}>
        Cadastre as pessoas do time do cliente na <Link href={`/clientes/${c.id}?aba=time`}>aba Time</Link> para marcar os treinamentos.
      </div>
    );
  }

  return (
    <section className="card">
      <div className="entre">
        <div className="pilha-p">
          <h2 className="h2">Treinamentos de cada pessoa</h2>
          <span className="small muted">Clique na capa para marcar ou desmarcar o que a pessoa já fez. O aluno vê a mesma coisa na área dele.</span>
        </div>
        <Link href="/treinamentos" className="small" style={{ fontWeight: 600 }}>Editar capas</Link>
      </div>

      {membros.map((m) => {
        const n = lista.filter((t) => feito[m.id + ':' + t.id]).length;
        return (
          <div key={m.id} className="aluno-bloco">
            <div className="entre" style={{ alignItems: 'flex-start' }}>
              <span className="linha" style={{ flexWrap: 'nowrap', gap: 12 }}>
                <span className="pilha-p" style={{ gap: 2 }}>
                  <span style={{ fontWeight: 600 }}>{m.nome}</span>
                  <span className="small muted">{n} de {lista.length} treinamentos feitos{m.cargo ? ' · ' + m.cargo : ''}</span>
                </span>
              </span>
              <AcessoAluno clienteId={c.id} membro={m} site={site} />
            </div>
            <div className="capas">
              {lista.map((t) => (
                <CapaMarcavel key={t.id} t={t} clienteId={c.id} membroId={m.id} feito={!!feito[m.id + ':' + t.id]} data={feito[m.id + ':' + t.id]} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
