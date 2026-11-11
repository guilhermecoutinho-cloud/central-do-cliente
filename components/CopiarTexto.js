'use client';

import { useState } from 'react';

export default function CopiarTexto({ texto, rotulo = 'Copiar mensagem' }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }
  return (
    <button type="button" className="btn-link" onClick={copiar} style={{ alignSelf: 'flex-start' }}>
      {copiado ? 'Copiado' : rotulo}
    </button>
  );
}
