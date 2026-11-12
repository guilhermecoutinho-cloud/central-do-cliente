import Icone from './Icone';
import { setorPorSlug } from '@/lib/setores';

// Símbolo de cada setor (no lugar das siglas SC, MK, VD...)
export default function SetorIcone({ slug, tamanho = 24, className = '' }) {
  const setor = setorPorSlug(slug);
  if (!setor) return null;
  const icone = Math.round(tamanho * 0.62);
  return (
    <span
      className={'sigla setor-ic ' + className}
      style={{ width: tamanho, height: tamanho, flexBasis: tamanho, borderRadius: Math.round(tamanho * 0.3) }}
      title={setor.nome}
      aria-hidden="true"
    >
      <Icone nome={setor.icone} tamanho={icone} />
    </span>
  );
}
