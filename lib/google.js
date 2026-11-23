// Google Agenda: login do Google (OAuth) e eventos das tarefas. Só no servidor.
import { setorPorSlug } from './setores';

export const GOOGLE_ID = () => (process.env.GOOGLE_CLIENT_ID || '').trim();
const GOOGLE_SEGREDO = () => (process.env.GOOGLE_CLIENT_SECRET || '').trim();
export const googleConfigurado = () => Boolean(GOOGLE_ID() && GOOGLE_SEGREDO());
// Só contas da empresa (Google Workspace) podem ser conectadas
export const DOMINIO = () => (process.env.GOOGLE_DOMINIO || 'capitalupgrade.com.br').trim().toLowerCase();
export const emailDaEmpresa = (email) => String(email || '').toLowerCase().endsWith('@' + DOMINIO());

const ESCOPOS = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.events'];
const API = 'https://www.googleapis.com/calendar/v3';

export function enderecoRetorno(origem) {
  return (process.env.GOOGLE_REDIRECT_URI || '').trim() || `${origem}/api/google/callback`;
}

export function urlLogin({ origem, estado, email }) {
  const p = new URLSearchParams({
    client_id: GOOGLE_ID(),
    redirect_uri: enderecoRetorno(origem),
    response_type: 'code',
    scope: ESCOPOS.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: estado,
    hd: DOMINIO(), // a tela do Google mostra só as contas da empresa
  });
  if (email) p.set('login_hint', email);
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + p.toString();
}

async function token(params) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: GOOGLE_ID(), client_secret: GOOGLE_SEGREDO(), ...params }),
    cache: 'no-store',
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(json.error_description || json.error || 'Google respondeu ' + r.status);
    e.codigo = json.error;
    throw e;
  }
  return json;
}

// Troca o código do login pelos acessos (e descobre o e-mail da conta)
export async function trocarCodigo(code, origem) {
  const t = await token({ code, grant_type: 'authorization_code', redirect_uri: enderecoRetorno(origem) });
  let email = null;
  try {
    email = JSON.parse(Buffer.from(String(t.id_token || '').split('.')[1] || '', 'base64url').toString('utf8')).email || null;
  } catch {}
  return { ...t, email };
}

export async function revogar(tokenQualquer) {
  if (!tokenQualquer) return;
  await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(tokenQualquer), { method: 'POST', cache: 'no-store' }).catch(() => {});
}

// Acesso válido da conta (renova sozinho quando venceu)
async function acessoDe(sb, conta) {
  if (conta.access_token && conta.expira_em && new Date(conta.expira_em).getTime() - Date.now() > 60_000) return conta.access_token;
  try {
    const t = await token({ refresh_token: conta.refresh_token, grant_type: 'refresh_token' });
    const expira = new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString();
    await sb.from('google_contas').update({ access_token: t.access_token, expira_em: expira, ultimo_erro: null }).eq('user_id', conta.user_id);
    return t.access_token;
  } catch (e) {
    const msg = e.codigo === 'invalid_grant' ? 'A conexão com o Google expirou ou foi removida. Conecte de novo.' : 'Falha ao renovar o acesso: ' + e.message;
    await sb.from('google_contas').update({ ultimo_erro: msg }).eq('user_id', conta.user_id);
    return null;
  }
}

async function chamar(acesso, metodo, caminho, corpo) {
  const r = await fetch(API + caminho, {
    method: metodo,
    headers: { Authorization: 'Bearer ' + acesso, 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: 'no-store',
  });
  const json = r.status === 204 ? {} : await r.json().catch(() => ({}));
  return { status: r.status, json };
}

const diaSeguinte = (iso) => {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

function eventoDaTarefa(t, urlApp) {
  const setor = setorPorSlug(t.setor)?.nome || t.setor;
  const feito = t.status === 'Feito';
  return {
    summary: (feito ? '✓ ' : '') + t.titulo,
    description: [
      `Tarefa da Central da Empresa · ${setor}${t.grupo ? ' › ' + t.grupo : ''}`,
      `Status: ${t.status} · Prioridade: ${t.prioridade}`,
      t.descricao ? '\n' + t.descricao : null,
      urlApp ? `\nAbrir na Central: ${urlApp}/tarefas/${t.id}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    start: { date: t.prazo },
    end: { date: diaSeguinte(t.prazo) },
    transparency: 'transparent', // não bloqueia a agenda
    extendedProperties: { private: { central_tarefa: t.id } },
  };
}

async function contaDe(sb, userId) {
  if (!userId) return null;
  const { data } = await sb.from('google_contas').select('*').eq('user_id', userId).maybeSingle();
  return data || null;
}

// Apaga um evento que a Central criou na agenda de alguém
export async function apagarEvento(sb, userId, eventoId) {
  const conta = await contaDe(sb, userId);
  if (!conta || !eventoId) return false;
  const acesso = await acessoDe(sb, conta);
  if (!acesso) return false;
  const r = await chamar(acesso, 'DELETE', `/calendars/${encodeURIComponent(conta.agenda)}/events/${encodeURIComponent(eventoId)}`);
  return r.status < 300 || r.status === 404 || r.status === 410;
}

// Deixa a agenda igual à tarefa: cria, atualiza, muda de pessoa ou apaga o evento
export async function sincronizarTarefa(sb, id, urlApp) {
  const { data: t } = await sb
    .from('tarefas')
    .select('id, titulo, descricao, setor, prazo, status, prioridade, responsavel, criado_por, google_evento_id, google_user, tarefa_grupos(nome)')
    .eq('id', id)
    .maybeSingle();
  if (!t) return { ok: false, motivo: 'tarefa não encontrada' };
  t.grupo = t.tarefa_grupos?.nome || null;

  const dono = t.responsavel || t.criado_por || null;
  const conta = await contaDe(sb, dono);

  // Mudou de pessoa, perdeu o prazo ou a pessoa desconectou: tira da agenda antiga
  if (t.google_evento_id && (t.google_user !== dono || !t.prazo || !conta)) {
    await apagarEvento(sb, t.google_user, t.google_evento_id);
    await sb.from('tarefas').update({ google_evento_id: null, google_user: null }).eq('id', t.id);
    t.google_evento_id = null;
  }
  if (!t.prazo || !conta) return { ok: true, motivo: 'sem prazo ou sem Google conectado' };

  const acesso = await acessoDe(sb, conta);
  if (!acesso) return { ok: false, motivo: 'sem acesso ao Google' };
  const corpo = eventoDaTarefa(t, urlApp);
  const base = `/calendars/${encodeURIComponent(conta.agenda)}/events`;

  let r = t.google_evento_id ? await chamar(acesso, 'PATCH', `${base}/${encodeURIComponent(t.google_evento_id)}`, corpo) : null;
  if (!r || r.status === 404 || r.status === 410) r = await chamar(acesso, 'POST', base, corpo);
  if (r.status >= 300) {
    const msg = 'Google Agenda: ' + (r.json?.error?.message || 'erro ' + r.status);
    await sb.from('google_contas').update({ ultimo_erro: msg }).eq('user_id', conta.user_id);
    return { ok: false, motivo: msg };
  }
  if (r.json.id !== t.google_evento_id || t.google_user !== dono) {
    await sb.from('tarefas').update({ google_evento_id: r.json.id, google_user: dono }).eq('id', t.id);
  }
  if (conta.ultimo_erro) await sb.from('google_contas').update({ ultimo_erro: null }).eq('user_id', conta.user_id);
  return { ok: true, evento: r.json.id };
}

// Coloca na agenda as tarefas abertas da pessoa com prazo de hoje em diante (ao conectar ou em "Sincronizar agora")
export async function sincronizarPessoa(sb, userId, urlApp, hoje, limite = 60) {
  const { data } = await sb
    .from('tarefas')
    .select('id')
    .or(`responsavel.eq.${userId},and(responsavel.is.null,criado_por.eq.${userId})`)
    .neq('status', 'Feito')
    .gte('prazo', hoje)
    .order('prazo')
    .limit(limite);
  let ok = 0;
  for (const { id } of data || []) {
    const r = await sincronizarTarefa(sb, id, urlApp).catch(() => ({ ok: false }));
    if (r.ok) ok++;
  }
  return { total: (data || []).length, ok };
}
