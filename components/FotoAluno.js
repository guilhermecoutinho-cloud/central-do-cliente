'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { salvarFoto } from '@/app/actions-ficha';

// Recorta no meio em quadrado e reduz para 600px (fica leve)
function prepararImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const lado = Math.min(img.width, img.height);
      const c = document.createElement('canvas');
      c.width = c.height = Math.min(600, lado);
      c.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Não consegui ler a imagem.'))), 'image/jpeg', 0.88);
    };
    img.onerror = () => reject(new Error('Não consegui abrir essa imagem.'));
    img.src = url;
  });
}

export default function FotoAluno({ id, url, nome }) {
  const router = useRouter();
  const input = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function escolher(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setErro('');
    setEnviando(true);
    try {
      const blob = await prepararImagem(arquivo);
      const caminho = `alunos/${id}/${Date.now()}.jpg`;
      const supabase = createClient();
      const { error } = await supabase.storage.from('capas').upload(caminho, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from('capas').getPublicUrl(caminho);
      await salvarFoto({ id, url: data.publicUrl });
      router.refresh();
    } catch (e2) {
      setErro(e2?.message || 'Não foi possível enviar a foto.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="ficha-foto-caixa">
      <button type="button" className="ficha-foto" onClick={() => input.current?.click()} title="Trocar foto" aria-label={'Trocar a foto de ' + nome}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={'Foto de ' + nome} />
        ) : (
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="8.5" r="4" />
            <path d="M4 20c1.4-3.6 4.4-5.5 8-5.5s6.6 1.9 8 5.5" />
          </svg>
        )}
        <span className="ficha-foto-acao">{enviando ? 'Enviando…' : url ? 'Trocar foto' : 'Colocar foto'}</span>
      </button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={escolher} hidden />
      {erro ? <span className="small" style={{ color: 'var(--coral)', maxWidth: 140, textAlign: 'center' }}>{erro}</span> : null}
    </div>
  );
}
