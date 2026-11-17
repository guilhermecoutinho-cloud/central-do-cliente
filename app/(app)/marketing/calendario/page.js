import { Lora } from 'next/font/google';
import { createClient } from '@/lib/supabase/server';
import { getPerfil, podeSetor } from '@/lib/perfil';
import { hojeISO } from '@/lib/tarefas';
import SemAcesso from '@/components/SemAcesso';
import CalendarioConteudo from '@/components/CalendarioConteudo';

const serifada = Lora({ subsets: ['latin'], weight: ['600', '700'], style: ['normal', 'italic'], display: 'swap', variable: '--fonte-serifada' });

export const metadata = { title: 'Calendário de conteúdo · Central da Empresa' };

// Marketing > Social mídia > Calendário de conteúdo
export default async function PaginaCalendario({ searchParams }) {
  const perfil = await getPerfil();
  if (!podeSetor(perfil, 'marketing')) return <SemAcesso setor="Marketing" />;

  const supabase = createClient();
  const { data: calendarios, error } = await supabase
    .from('conteudo_calendarios')
    .select('id, titulo, subtitulo, inicio, fim, funil, regras, eventos, semanas, nota')
    .order('inicio', { ascending: false });
  if (error) {
    return <div className="aviso t-amber">Falta ativar o calendário de conteúdo: rode o arquivo supabase/calendario-conteudo.sql no SQL Editor do Supabase.</div>;
  }

  const lista = calendarios || [];
  const hoje = hojeISO();
  // Abre o pedido na URL; senão o que está valendo hoje; senão o próximo; senão o mais recente
  const atual =
    lista.find((c) => c.id === searchParams?.c) ||
    lista.find((c) => c.inicio <= hoje && c.fim >= hoje) ||
    [...lista].reverse().find((c) => c.inicio > hoje) ||
    lista[0] ||
    null;

  const [{ data: posts }, { data: equipe }] = await Promise.all([
    atual
      ? supabase.from('conteudo_posts').select('id, calendario_id, data, data_fim, campanha, descricao, formato, link, feito, feito_em, responsavel, ordem').eq('calendario_id', atual.id).order('data').order('ordem')
      : Promise.resolve({ data: [] }),
    supabase.from('equipe').select('user_id, nome').order('nome'),
  ]);

  return (
    <div className={serifada.variable} style={{ display: 'contents' }}>
      <CalendarioConteudo
        key={atual?.id || 'vazio'}
        calendarios={lista.map(({ id, inicio, fim, titulo }) => ({ id, inicio, fim, titulo }))}
        calendario={atual}
        posts={posts || []}
        equipe={equipe || []}
        hoje={hoje}
      />
    </div>
  );
}
