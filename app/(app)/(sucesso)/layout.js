import { getPerfil, podeSetor } from '@/lib/perfil';
import SemAcesso from '@/components/SemAcesso';

// Todas as telas do Sucesso do Cliente passam por aqui.
export default async function SucessoLayout({ children }) {
  const perfil = await getPerfil();
  if (!podeSetor(perfil, 'sucesso')) return <SemAcesso setor="Sucesso do Cliente" />;
  return children;
}
