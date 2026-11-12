// Conector da Central para o Claude (protocolo MCP).
// Com ele, no chat do Claude dá para pedir "cria essas tarefas no marketing"
// e elas aparecem direto no quadro do setor.
//
// Este arquivo tem só a lógica. O acesso ao banco chega pronto em `db`
// (veja app/api/claude/[chave]/route.js), o que permite testar sem Supabase.

import { SETORES, SLUGS } from './setores';
import { NOMES_PRIORIDADE, NOMES_STATUS, hojeISO, somarDias } from './tarefas';

export const VERSAO_PROTOCOLO = '2025-06-18';
const PROTOCOLOS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const CORES_NOVO_GRUPO = ['blue', 'violet', 'amber', 'teal', 'coral', 'green'];

// ---------------------------------------------------------------- Normalização

export function norm(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const APELIDOS_SETOR = {
  sucesso: ['sucesso', 'sucesso do cliente', 'cs', 'cliente', 'clientes', 'customer success', 'sc'],
  marketing: ['marketing', 'mkt', 'mk'],
  vendas: ['vendas', 'comercial', 'vd', 'venda'],
  eventos: ['eventos', 'evento', 'ev'],
  financeiro: ['financeiro', 'fin', 'fn', 'financas'],
};

export function lerSetor(v) {
  const n = norm(v);
  if (!n) return null;
  return SLUGS.find((s) => APELIDOS_SETOR[s].includes(n) || norm(SETORES.find((x) => x.slug === s).nome) === n) || null;
}

export function lerStatus(v) {
  const n = norm(v);
  if (!n) return null;
  if (/^(feit|conclu|pront|finaliz|entreg|ok$|done)/.test(n)) return 'Feito';
  if (/^(travad|bloquead|parad|impedid|aguardando)/.test(n)) return 'Travado';
  if (/^(em andamento|em execucao|fazendo|andamento|execucao|iniciad|em progresso|doing)/.test(n)) return 'Em andamento';
  if (/^(nao iniciad|a fazer|pendente|novo|nova|to ?do|aberta?)/.test(n)) return 'Não iniciado';
  return NOMES_STATUS.find((s) => norm(s) === n) || null;
}

export function lerPrioridade(v) {
  const n = norm(v);
  if (!n) return null;
  const p = { p0: 'Crítica', p1: 'Alta', p2: 'Média', p3: 'Baixa', urgente: 'Crítica', critica: 'Crítica', alta: 'Alta', media: 'Média', normal: 'Média', baixa: 'Baixa' };
  return p[n] || NOMES_PRIORIDADE.find((x) => norm(x) === n) || null;
}

const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

// Aceita AAAA-MM-DD, DD/MM/AAAA, DD/MM, "hoje", "amanhã" e dia da semana ("sexta")
export function lerData(v, hoje = hojeISO()) {
  const n = norm(v);
  if (!n) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(n)) return n;
  let m = n.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (m) {
    let ano = m[3] ? Number(m[3]) : Number(hoje.slice(0, 4));
    if (ano < 100) ano += 2000;
    let iso = `${ano}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
    // Sem ano e já passou há mais de 2 meses: é do ano que vem (ex.: "05/01" dito em novembro)
    if (!m[3] && iso < somarDias(hoje, -60)) iso = `${ano + 1}` + iso.slice(4);
    const d = new Date(iso + 'T12:00:00Z');
    return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
  }
  if (n === 'hoje') return hoje;
  if (n === 'amanha') return somarDias(hoje, 1);
  if (n === 'depois de amanha') return somarDias(hoje, 2);
  const dia = DIAS_SEMANA.findIndex((d) => n.replace(/-feira$/, '').replace(/^(na |no |ate )/, '') === d);
  if (dia >= 0) {
    const atual = new Date(hoje + 'T12:00:00Z').getUTCDay();
    return somarDias(hoje, ((dia - atual + 7) % 7) || 7);
  }
  return null;
}

// Acha alguém da equipe pelo nome completo, primeiro nome ou e-mail
export function acharPessoa(v, equipe) {
  const n = norm(v);
  if (!n) return null;
  if (n.includes('@')) {
    const porEmail = equipe.find((p) => p.email && norm(p.email) === n);
    if (porEmail) return porEmail;
  }
  const exato = equipe.find((p) => norm(p.nome) === n);
  if (exato) return exato;
  const base = n.includes('@') ? n.split('@')[0].replace(/[._\-\d]+/g, ' ').trim() : n;
  const primeiro = base.split(' ')[0];
  const candidatos = equipe.filter((p) => {
    const nome = norm(p.nome);
    const junto = nome.replace(/ /g, '');
    const baseJunto = base.replace(/ /g, '');
    const primeiroNome = nome.split(' ')[0];
    return (
      primeiroNome === primeiro ||
      nome.startsWith(base) ||
      (base.length >= 5 && junto.startsWith(baseJunto)) ||
      (junto.length >= 5 && baseJunto.startsWith(junto)) ||
      (n.includes('@') && primeiroNome.length >= 4 && baseJunto.startsWith(primeiroNome))
    );
  });
  return candidatos.length === 1 ? candidatos[0] : null;
}

// ---------------------------------------------------------------- Ferramentas

const SETOR_PROP = { type: 'string', description: 'Setor: sucesso, marketing, vendas, eventos ou financeiro.' };

export const FERRAMENTAS = [
  {
    name: 'ver_central',
    title: 'Ver setores, grupos e equipe',
    description:
      'Mostra a data de hoje, os setores da Central da Empresa (Capital Upgrade), os grupos de cada setor, quantas tarefas cada um tem e os nomes da equipe. Use antes de criar tarefas para acertar setor, grupo e responsável.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'listar_tarefas',
    title: 'Listar tarefas',
    description:
      'Lista tarefas da Central com filtros. Sem filtros, traz as abertas (não concluídas) de todos os setores, ordenadas por prazo. Cada linha traz o id, que serve para atualizar a tarefa.',
    inputSchema: {
      type: 'object',
      properties: {
        setor: SETOR_PROP,
        status: { type: 'string', description: 'abertas (padrão), todas, Não iniciado, Em andamento, Travado ou Feito.' },
        responsavel: { type: 'string', description: 'Nome ou e-mail de quem é a tarefa.' },
        busca: { type: 'string', description: 'Parte do nome da tarefa.' },
        prazo_ate: { type: 'string', description: 'Só tarefas com prazo até esta data (AAAA-MM-DD).' },
        limite: { type: 'integer', minimum: 1, maximum: 200, description: 'Máximo de tarefas (padrão 60).' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'criar_tarefas',
    title: 'Criar tarefas',
    description:
      'Cria uma ou várias tarefas no quadro de um setor da Central (até 200 por vez, bom para importar planilhas). ' +
      'Prioridade aceita P0 (Crítica), P1 (Alta), P2 (Média), P3 (Baixa). Status aceita Não iniciado, Em andamento, Travado, Feito (e sinônimos como Concluída, Em execução, Bloqueada). ' +
      'Prazo em AAAA-MM-DD (também aceita DD/MM/AAAA, hoje, amanhã, sexta). Se o grupo não existir no setor, ele é criado. Sem grupo, vai para o primeiro grupo do setor. ' +
      'Por padrão pula tarefas com o mesmo nome que já existem no setor, então dá para importar a mesma planilha de novo sem duplicar.',
    inputSchema: {
      type: 'object',
      properties: {
        tarefas: {
          type: 'array',
          minItems: 1,
          maxItems: 200,
          items: {
            type: 'object',
            properties: {
              setor: SETOR_PROP,
              titulo: { type: 'string', description: 'Nome da tarefa.' },
              grupo: { type: 'string', description: 'Nome do grupo dentro do setor (ex.: GI Alphaville, Black November).' },
              responsavel: { type: 'string', description: 'Nome ou e-mail de alguém da equipe.' },
              status: { type: 'string' },
              prioridade: { type: 'string' },
              prazo: { type: 'string' },
              descricao: { type: 'string', description: 'Detalhes, links, observações.' },
            },
            required: ['setor', 'titulo'],
            additionalProperties: false,
          },
        },
        pular_repetidas: { type: 'boolean', description: 'Pula tarefas que já existem com o mesmo nome no setor (padrão: sim).' },
      },
      required: ['tarefas'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  {
    name: 'atualizar_tarefa',
    title: 'Atualizar tarefa',
    description:
      'Muda uma tarefa existente: status (ex.: marcar como Feito), prioridade, responsável, prazo, grupo, nome, descrição, ou publica um comentário no mural dela. ' +
      'Informe o id (da lista) ou uma busca pelo nome; se a busca achar mais de uma, a resposta lista as opções para escolher pelo id.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Id da tarefa.' },
        busca: { type: 'string', description: 'Parte do nome da tarefa, se não tiver o id.' },
        setor: { type: 'string', description: 'Ajuda a busca: setor da tarefa.' },
        titulo: { type: 'string', description: 'Novo nome.' },
        status: { type: 'string' },
        prioridade: { type: 'string' },
        responsavel: { type: 'string', description: 'Nome ou e-mail. Use "ninguém" para tirar o responsável.' },
        prazo: { type: 'string', description: 'Novo prazo. Use "sem prazo" para tirar.' },
        grupo: { type: 'string' },
        descricao: { type: 'string' },
        comentario: { type: 'string', description: 'Texto para publicar no mural de atualizações da tarefa.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
];

const nomeSetor = (slug) => SETORES.find((s) => s.slug === slug)?.nome || slug;

function linhaTarefa(t, ctx) {
  const partes = [
    t.titulo,
    nomeSetor(t.setor) + (ctx.grupoPorId[t.grupo_id] ? ' › ' + ctx.grupoPorId[t.grupo_id].nome : ''),
    t.status,
    t.prioridade,
    ctx.pessoaPorId[t.responsavel]?.nome || 'sem responsável',
    t.prazo ? 'prazo ' + t.prazo.split('-').reverse().join('/') : 'sem prazo',
  ];
  return `- ${partes.join(' · ')} [id ${t.id}]`;
}

async function contexto(db) {
  const [grupos, equipe] = await Promise.all([db.grupos(), db.equipe()]);
  return {
    grupos,
    equipe,
    grupoPorId: Object.fromEntries(grupos.map((g) => [g.id, g])),
    pessoaPorId: Object.fromEntries(equipe.map((p) => [p.user_id, p])),
  };
}

async function verCentral(db, args, base) {
  const ctx = await contexto(db);
  const contagem = await db.contarPorGrupo();
  const linhas = [`Hoje é ${hojeISO()} (horário de Brasília). Plataforma: ${base}`, '', 'Setores e grupos:'];
  SETORES.forEach((s) => {
    const gs = ctx.grupos.filter((g) => g.setor === s.slug);
    linhas.push(`- ${s.nome} (setor: ${s.slug}): ` + (gs.length ? gs.map((g) => `${g.nome} (${contagem[g.id] || 0})`).join(', ') : 'sem grupos'));
  });
  linhas.push('', 'Equipe: ' + (ctx.equipe.map((p) => p.nome + (p.email ? ` <${p.email}>` : '')).join(', ') || 'ninguém cadastrado'));
  return linhas.join('\n');
}

async function listarTarefas(db, args, base) {
  const ctx = await contexto(db);
  const filtros = { limite: Math.min(200, Math.max(1, Number(args.limite) || 60)) };
  const avisos = [];
  if (args.setor) {
    filtros.setor = lerSetor(args.setor);
    if (!filtros.setor) return { erro: `Setor "${args.setor}" não existe. Use: ${SLUGS.join(', ')}.` };
  }
  const st = norm(args.status || 'abertas');
  if (st === 'abertas' || st === 'aberta') filtros.abertas = true;
  else if (st !== 'todas' && st !== 'todos') {
    filtros.status = lerStatus(args.status);
    if (!filtros.status) return { erro: `Status "${args.status}" não reconhecido.` };
  }
  if (args.responsavel) {
    const p = acharPessoa(args.responsavel, ctx.equipe);
    if (!p) return { erro: `Não achei "${args.responsavel}" na equipe. Equipe: ${ctx.equipe.map((x) => x.nome).join(', ')}.` };
    filtros.responsavel = p.user_id;
  }
  if (args.busca) filtros.busca = String(args.busca).slice(0, 100);
  if (args.prazo_ate) {
    filtros.prazoAte = lerData(args.prazo_ate);
    if (!filtros.prazoAte) avisos.push(`Data "${args.prazo_ate}" ignorada.`);
  }
  const tarefas = await db.listarTarefas(filtros);
  if (!tarefas.length) return 'Nenhuma tarefa encontrada com esses filtros.' + (avisos.length ? '\n' + avisos.join('\n') : '');
  return [`${tarefas.length} tarefa(s):`, ...tarefas.map((t) => linhaTarefa(t, ctx)), ...avisos, '', `Quadros: ${base}/setor/<setor>`].join('\n');
}

async function grupoDoSetor(db, ctx, setor, nomeGrupo) {
  const doSetor = ctx.grupos.filter((g) => g.setor === setor).sort((a, b) => a.ordem - b.ordem);
  if (nomeGrupo) {
    const achado = doSetor.find((g) => norm(g.nome) === norm(nomeGrupo));
    if (achado) return { grupo: achado };
  } else if (doSetor.length) {
    return { grupo: doSetor[0] };
  }
  const nome = String(nomeGrupo || 'Tarefas').trim().slice(0, 80);
  const cor = CORES_NOVO_GRUPO[doSetor.length % CORES_NOVO_GRUPO.length];
  const ordem = doSetor.length ? Math.max(...doSetor.map((g) => g.ordem)) + 1 : 0;
  const novo = await db.criarGrupo({ setor, nome, cor, ordem });
  ctx.grupos.push(novo);
  ctx.grupoPorId[novo.id] = novo;
  return { grupo: novo, criado: true };
}

async function criarTarefas(db, args, base) {
  const lista = Array.isArray(args.tarefas) ? args.tarefas.slice(0, 200) : [];
  if (!lista.length) return { erro: 'Mande pelo menos uma tarefa em "tarefas".' };
  const pular = args.pular_repetidas !== false;
  const ctx = await contexto(db);
  const hoje = hojeISO();

  const problemas = [];
  const avisos = [];
  const gruposNovos = [];
  const linhas = [];
  const vistos = new Set();

  const setoresUsados = [...new Set(lista.map((t) => lerSetor(t.setor)).filter(Boolean))];
  const existentes = pular ? await db.titulosExistentes(setoresUsados) : [];
  existentes.forEach((t) => vistos.add(t.setor + '|' + norm(t.titulo)));
  let repetidas = 0;

  for (const [i, t] of lista.entries()) {
    const ref = `#${i + 1} "${String(t.titulo || '').slice(0, 60)}"`;
    const setor = lerSetor(t.setor);
    const titulo = String(t.titulo || '').trim().slice(0, 300);
    if (!titulo) { problemas.push(`${ref}: sem nome, ignorada.`); continue; }
    if (!setor) { problemas.push(`${ref}: setor "${t.setor}" não existe, ignorada.`); continue; }
    const chave = setor + '|' + norm(titulo);
    if (pular && vistos.has(chave)) { repetidas += 1; continue; }
    vistos.add(chave);

    const { grupo, criado } = await grupoDoSetor(db, ctx, setor, t.grupo);
    if (criado) gruposNovos.push(`${grupo.nome} (${nomeSetor(setor)})`);

    const status = t.status ? lerStatus(t.status) : 'Não iniciado';
    if (t.status && !status) avisos.push(`${ref}: status "${t.status}" não reconhecido, ficou Não iniciado.`);
    const prioridade = t.prioridade ? lerPrioridade(t.prioridade) : 'Média';
    if (t.prioridade && !prioridade) avisos.push(`${ref}: prioridade "${t.prioridade}" não reconhecida, ficou Média.`);
    const prazo = t.prazo ? lerData(t.prazo, hoje) : null;
    if (t.prazo && !prazo) avisos.push(`${ref}: prazo "${t.prazo}" não entendido, ficou sem prazo.`);
    let responsavel = null;
    if (t.responsavel) {
      const p = acharPessoa(t.responsavel, ctx.equipe);
      if (p) responsavel = p.user_id;
      else avisos.push(`${ref}: "${t.responsavel}" não está na equipe da Central, ficou sem responsável.`);
    }
    const agora = new Date().toISOString();
    linhas.push({
      setor,
      grupo_id: grupo.id,
      titulo,
      descricao: t.descricao ? String(t.descricao).slice(0, 10000) : null,
      status: status || 'Não iniciado',
      prioridade: prioridade || 'Média',
      prazo,
      responsavel,
      concluida_em: status === 'Feito' ? agora : null,
    });
  }

  const criadas = linhas.length ? await db.inserirTarefas(linhas) : [];
  if (criadas.length) await db.registrar(criadas.map((c) => ({ tarefa_id: c.id, texto: 'criou a tarefa pelo Claude' })));

  const porSetor = {};
  criadas.forEach((c) => (porSetor[c.setor] = (porSetor[c.setor] || 0) + 1));
  const out = [
    criadas.length
      ? `${criadas.length} tarefa(s) criada(s): ` + Object.entries(porSetor).map(([s, n]) => `${n} em ${nomeSetor(s)} (${base}/setor/${s})`).join(', ') + '.'
      : 'Nenhuma tarefa nova criada.',
  ];
  if (criadas.length && criadas.length <= 15) out.push(...criadas.map((c) => linhaTarefa(c, ctx)));
  if (repetidas) out.push(`${repetidas} já existiam com o mesmo nome e foram puladas.`);
  if (gruposNovos.length) out.push('Grupos criados: ' + gruposNovos.join(', ') + '.');
  if (avisos.length) out.push('Avisos:', ...avisos.slice(0, 30).map((a) => '- ' + a));
  if (problemas.length) out.push('Não criadas:', ...problemas.slice(0, 30).map((a) => '- ' + a));
  return out.join('\n');
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function atualizarTarefa(db, args, base) {
  const ctx = await contexto(db);
  let tarefa = null;
  if (args.id) {
    if (!UUID.test(String(args.id).trim())) return { erro: 'Id inválido. Use listar_tarefas para pegar o id.' };
    tarefa = await db.tarefaPorId(String(args.id).trim());
    if (!tarefa) return { erro: 'Tarefa não encontrada com esse id.' };
  } else if (args.busca) {
    const setor = args.setor ? lerSetor(args.setor) : undefined;
    const achadas = await db.listarTarefas({ busca: String(args.busca).slice(0, 100), setor, limite: 10 });
    if (!achadas.length) return { erro: `Nenhuma tarefa com "${args.busca}" no nome.` };
    const exata = achadas.filter((t) => norm(t.titulo) === norm(args.busca));
    if (achadas.length > 1 && exata.length !== 1) {
      return `Achei ${achadas.length} tarefas com "${args.busca}". Diga qual pelo id:\n` + achadas.map((t) => linhaTarefa(t, ctx)).join('\n');
    }
    tarefa = exata[0] || achadas[0];
  } else {
    return { erro: 'Informe o id ou uma busca pelo nome da tarefa.' };
  }

  const dados = {};
  const feito = [];
  const avisos = [];
  if (args.titulo !== undefined) {
    const t = String(args.titulo).trim().slice(0, 300);
    if (t) { dados.titulo = t; feito.push(`mudou o nome para ${t}`); }
  }
  if (args.status !== undefined) {
    const s = lerStatus(args.status);
    if (s) { dados.status = s; dados.concluida_em = s === 'Feito' ? new Date().toISOString() : null; feito.push(`mudou o status para ${s}`); }
    else avisos.push(`Status "${args.status}" não reconhecido.`);
  }
  if (args.prioridade !== undefined) {
    const p = lerPrioridade(args.prioridade);
    if (p) { dados.prioridade = p; feito.push(`mudou a prioridade para ${p}`); }
    else avisos.push(`Prioridade "${args.prioridade}" não reconhecida.`);
  }
  if (args.responsavel !== undefined) {
    const n = norm(args.responsavel);
    if (['', 'ninguem', 'nenhum', 'sem responsavel'].includes(n)) { dados.responsavel = null; feito.push('tirou o responsável'); }
    else {
      const p = acharPessoa(args.responsavel, ctx.equipe);
      if (p) { dados.responsavel = p.user_id; feito.push(`mudou o responsável para ${p.nome}`); }
      else avisos.push(`"${args.responsavel}" não está na equipe.`);
    }
  }
  if (args.prazo !== undefined) {
    const n = norm(args.prazo);
    if (['', 'sem prazo', 'nenhum'].includes(n)) { dados.prazo = null; feito.push('tirou o prazo'); }
    else {
      const d = lerData(args.prazo);
      if (d) { dados.prazo = d; feito.push(`mudou o prazo para ${d.split('-').reverse().join('/')}`); }
      else avisos.push(`Prazo "${args.prazo}" não entendido.`);
    }
  }
  if (args.grupo !== undefined && String(args.grupo).trim()) {
    const { grupo } = await grupoDoSetor(db, ctx, tarefa.setor, args.grupo);
    dados.grupo_id = grupo.id;
    feito.push(`moveu para o grupo ${grupo.nome}`);
  }
  if (args.descricao !== undefined) { dados.descricao = String(args.descricao).slice(0, 10000) || null; feito.push('atualizou a descrição'); }

  if (Object.keys(dados).length) {
    dados.atualizado_em = new Date().toISOString();
    await db.atualizarTarefa(tarefa.id, dados);
    await db.registrar(feito.map((texto) => ({ tarefa_id: tarefa.id, texto: texto + ' pelo Claude' })));
  }
  if (args.comentario && String(args.comentario).trim()) {
    await db.comentar(tarefa.id, String(args.comentario).trim().slice(0, 5000));
    feito.push('publicou um comentário no mural');
  }
  if (!feito.length) return { erro: 'Nada para mudar. ' + avisos.join(' ') };

  const atual = { ...tarefa, ...dados };
  return [`Tarefa "${atual.titulo}" atualizada: ${feito.join(', ')}.`, linhaTarefa(atual, ctx), `${base}/tarefas/${tarefa.id}`, ...avisos].join('\n');
}

const EXECUTORES = { ver_central: verCentral, listar_tarefas: listarTarefas, criar_tarefas: criarTarefas, atualizar_tarefa: atualizarTarefa };

// ---------------------------------------------------------------- JSON-RPC

const INSTRUCOES =
  'Central da Empresa da Capital Upgrade: quadros de tarefas por setor (sucesso, marketing, vendas, eventos, financeiro). ' +
  'Quando a pessoa mandar tarefas no chat, crie com criar_tarefas. Para saber grupos e nomes da equipe, use ver_central. ' +
  'Para marcar como feita ou mudar algo, use atualizar_tarefa. Responda em português.';

function resposta(id, result) {
  return { jsonrpc: '2.0', id, result };
}
function falha(id, code, message) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

// Responde uma mensagem JSON-RPC. Notificações (sem id) não têm resposta (null).
export async function processar(msg, db, base) {
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    return falha(msg?.id, -32600, 'Requisição inválida');
  }
  const { id, method, params } = msg;
  const notificacao = id === undefined || id === null;

  if (method.startsWith('notifications/')) return null;

  if (method === 'initialize') {
    const pedida = params?.protocolVersion;
    return resposta(id, {
      protocolVersion: PROTOCOLOS.includes(pedida) ? pedida : VERSAO_PROTOCOLO,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'central-da-empresa', title: 'Central da Empresa · Capital Upgrade', version: '1.0.0' },
      instructions: INSTRUCOES,
    });
  }
  if (method === 'ping') return notificacao ? null : resposta(id, {});
  if (method === 'tools/list') return resposta(id, { tools: FERRAMENTAS });
  if (method === 'resources/list') return resposta(id, { resources: [] });
  if (method === 'prompts/list') return resposta(id, { prompts: [] });

  if (method === 'tools/call') {
    const nome = params?.name;
    const executar = EXECUTORES[nome];
    if (!executar) return falha(id, -32602, `Ferramenta desconhecida: ${nome}`);
    try {
      const r = await executar(db, params?.arguments || {}, base);
      if (r && typeof r === 'object' && r.erro) return resposta(id, { content: [{ type: 'text', text: r.erro }], isError: true });
      return resposta(id, { content: [{ type: 'text', text: String(r) }] });
    } catch (e) {
      console.error('Conector Claude:', e);
      return resposta(id, { content: [{ type: 'text', text: 'Erro ao falar com o banco: ' + (e?.message || 'desconhecido') }], isError: true });
    }
  }

  return notificacao ? null : falha(id, -32601, `Método não suportado: ${method}`);
}
