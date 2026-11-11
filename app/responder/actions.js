'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function enviarAssessment(formData) {
  const supabase = createClient();
  const nome = String(formData.get('nome') || '').trim().slice(0, 150);
  const contato = String(formData.get('contato') || '').trim().slice(0, 200);
  if (!nome || contato.length < 5) redirect('/responder?erro=campos');

  const { data: perguntas } = await supabase.from('assessment_perguntas').select('id, texto').eq('ativa', true).order('ordem');
  const respostas = (perguntas || []).map((p) => ({
    pergunta: p.texto,
    resposta: String(formData.get('q_' + p.id) || '').trim().slice(0, 5000),
  }));

  const { error } = await supabase.rpc('responder_assessment', {
    p_nome: nome,
    p_contato: contato,
    p_respostas: respostas,
  });
  if (error) redirect('/responder?erro=envio');
  redirect('/responder?ok=1');
}
