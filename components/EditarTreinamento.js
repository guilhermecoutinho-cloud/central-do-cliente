'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { salvarTreinamento } from '@/app/actions-aluno';
import CapaTreinamento from './CapaTreinamento';

// Editar um treinamento: subir a capa, nome e descrição.
export default function EditarTreinamento({ t, alunos }) {
  const router = useRouter();
  const [atual, setAtual] = useState(t);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [, iniciar] = useTransition();

  function salvar(dados) {
    setErro('');
    setAtual((a) => ({ ...a, ...dados }));
    iniciar(async () => {
      try {
        await salvarTreinamento({ id: t.id, ...dados });
        router.refresh();
      } catch (e) {
        setErro(e?.message || 'Não foi possível salvar.');
      }
    });
  }

  async function subirCapa(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setErro('Use uma imagem JPG, PNG ou WEBP.');
    if (f.size > 5 * 1024 * 1024) return setErro('A imagem passa de 5 MB.');
    setEnviando(true);
    setErro('');
    try {
      const supabase = createClient();
      const ext = f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg';
      const caminho = `${String(t.sigla).normalize('NFD').replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('capas').upload(caminho, f, { upsert: false, contentType: f.type, cacheControl: '31536000' });
      if (error) throw error;
      const { data } = supabase.storage.from('capas').getPublicUrl(caminho);
      salvar({ capa_url: data.publicUrl });
    } catch (err) {
      setErro(err?.message || 'Não foi possível subir a capa.');
    } finally {
      setEnviando(false);
      e.target.value = '';
    }
  }

  return (
    <div className="card" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ width: 170, flex: '0 0 170px' }}>
        <CapaTreinamento t={atual} feito={false} rotuloPendente={`${alunos} ${alunos === 1 ? 'aluno concluiu' : 'alunos concluíram'}`} />
      </div>
      <div className="pilha" style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div className="entre">
          <span className="pill t-gray">{t.sigla}</span>
          <label className="small muted" style={{ display: 'inline-flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked={t.ativo} onChange={(e) => salvar({ ativo: e.target.checked })} />
            Aparece para os alunos
          </label>
        </div>
        <div className="campo">
          <label htmlFor={'nome-' + t.id}>Nome do treinamento</label>
          <input id={'nome-' + t.id} defaultValue={t.nome} onBlur={(e) => e.target.value !== atual.nome && salvar({ nome: e.target.value })} />
        </div>
        <div className="campo">
          <label htmlFor={'desc-' + t.id}>Descrição</label>
          <textarea id={'desc-' + t.id} defaultValue={t.descricao || ''} rows={2} onBlur={(e) => e.target.value !== (atual.descricao || '') && salvar({ descricao: e.target.value })} />
        </div>
        <div className="linha">
          <label className="btn btn-sec btn-p" style={{ cursor: 'pointer' }}>
            {enviando ? 'Enviando…' : atual.capa_url ? 'Trocar capa' : 'Subir capa'}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={subirCapa} hidden disabled={enviando} />
          </label>
          {atual.capa_url ? <button type="button" className="btn-perigo" onClick={() => salvar({ capa_url: null })}>Tirar capa</button> : null}
          <span className="small muted">Imagem em pé (2:3), por exemplo 600 × 900 px, até 5 MB.</span>
        </div>
        {erro ? <span className="small" style={{ color: 'var(--coral)' }}>{erro}</span> : null}
      </div>
    </div>
  );
}
