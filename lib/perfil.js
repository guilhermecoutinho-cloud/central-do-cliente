import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { usuarioId } from '@/lib/supabase/usuario';
import { SLUGS } from '@/lib/setores';

// Quem está logado, o papel e os setores que pode ver.
// "cache" faz o layout e a página reaproveitarem a mesma consulta na mesma visita.
export const getPerfil = cache(async () => {
  const supabase = createClient();
  const id = await usuarioId(supabase);
  if (!id) return null;

  const [{ data: membro, error }, setoresRes] = await Promise.all([
    supabase.from('equipe').select('nome, papel').eq('user_id', id).maybeSingle(),
    supabase.from('equipe_setores').select('setor').eq('user_id', id),
  ]);

  if (error) return { id, erro: error.message };
  if (!membro) return { id, semEquipe: true };

  const admin = membro.papel === 'admin';
  // Antes de rodar supabase/central-empresa.sql a tabela de setores não existe:
  // segue funcionando só com o Sucesso do Cliente.
  const semMigracao = !!setoresRes.error;
  const setores = admin ? SLUGS : semMigracao ? ['sucesso'] : (setoresRes.data || []).map((s) => s.setor);

  return { id, nome: membro.nome, papel: membro.papel, admin, setores, semMigracao };
});

export function podeSetor(perfil, slug) {
  return !!perfil && (perfil.admin || (perfil.setores || []).includes(slug));
}
