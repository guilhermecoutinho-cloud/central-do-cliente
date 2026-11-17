import { getPerfil, podeSetor } from '@/lib/perfil';
import SemAcesso from '@/components/SemAcesso';

export default async function LayoutRh({ children }) {
  const perfil = await getPerfil();
  if (!podeSetor(perfil, 'rh')) return <SemAcesso setor="RH" />;
  return children;
}
