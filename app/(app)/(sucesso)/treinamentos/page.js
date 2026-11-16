import { createClient } from '@/lib/supabase/server';
import EditarTreinamento from '@/components/EditarTreinamento';

export default async function Treinamentos() {
  const supabase = createClient();
  const [{ data: treinamentos, error }, { data: checks }] = await Promise.all([
    supabase.from('treinamentos').select('*').order('ordem'),
    supabase.from('aluno_treinamentos').select('treinamento_id'),
  ]);

  const porTreino = {};
  (checks || []).forEach((c) => (porTreino[c.treinamento_id] = (porTreino[c.treinamento_id] || 0) + 1));

  return (
    <>
      <div className="topo">
        <div>
          <span className="eyebrow">Sucesso do Cliente · área do aluno</span>
          <h1 className="titulo">Treinamentos</h1>
          <span className="small" style={{ color: 'var(--texto3)' }}>
            As capas aparecem na ficha de cada cliente e na área do aluno. Para marcar quem já fez, abra o cliente na aba Treinamentos.
          </span>
        </div>
      </div>
      {error ? (
        <div className="aviso t-amber">Falta ativar os treinamentos: rode o arquivo supabase/area-aluno.sql no SQL Editor do Supabase.</div>
      ) : (
        <div className="pilha" style={{ gap: 14 }}>
          {(treinamentos || []).map((t) => (
            <EditarTreinamento key={t.id} t={t} alunos={porTreino[t.id] || 0} />
          ))}
        </div>
      )}
    </>
  );
}
