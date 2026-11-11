'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { registrarArquivo } from '@/app/actions';
import { SETORES } from '@/lib/util';

function nomeSeguro(nome) {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .slice(-120);
}

export default function UploadArquivo({ clienteId, setorInicial = 'Geral' }) {
  const router = useRouter();
  const [setor, setSetor] = useState(setorInicial);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function enviar(e) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem('arquivo');
    const arquivos = Array.from(input.files || []);
    if (!arquivos.length) return;
    setEnviando(true);
    setErro('');
    const supabase = createClient();
    try {
      for (const f of arquivos) {
        const caminho = `${clienteId}/${nomeSeguro(setor)}/${Date.now()}-${nomeSeguro(f.name)}`;
        const { error } = await supabase.storage.from('arquivos').upload(caminho, f, { upsert: false });
        if (error) throw error;
        await registrarArquivo({ cliente_id: clienteId, setor, nome: f.name, caminho, tamanho: f.size });
      }
      input.value = '';
      router.refresh();
    } catch (err) {
      setErro(err?.message || 'Não foi possível enviar o arquivo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="card-2 pilha" style={{ borderStyle: 'dashed', borderColor: 'var(--borda-forte)' }}>
      <div className="form-grid">
        <div className="campo">
          <label htmlFor="setor-upload">Setor</label>
          <select id="setor-upload" value={setor} onChange={(e) => setSetor(e.target.value)}>
            {SETORES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="arquivo">Arquivos (contratos, PDFs, gravações)</label>
          <input id="arquivo" name="arquivo" type="file" multiple />
        </div>
      </div>
      {erro ? <div className="aviso t-coral">{erro}</div> : null}
      <button type="submit" className="btn btn-p" disabled={enviando} style={{ alignSelf: 'flex-start' }}>
        {enviando ? 'Enviando...' : 'Anexar arquivo'}
      </button>
    </form>
  );
}
