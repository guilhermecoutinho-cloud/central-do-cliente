// Contas do painel (dashboard) de cada setor, feitas a partir das tarefas.
import { STATUS, PRIORIDADES, atrasada, hojeISO, somarDias } from './tarefas';

// Segunda-feira da semana de uma data AAAA-MM-DD
function inicioSemana(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  const dia = (d.getUTCDay() + 6) % 7; // 0 = segunda
  return somarDias(iso, -dia);
}

export function resumoPainel(tarefas, grupos, equipe, hoje) {
  const abertas = tarefas.filter((t) => t.status !== 'Feito');
  const feitas = tarefas.filter((t) => t.status === 'Feito');
  const atrasadas = abertas.filter((t) => atrasada(t, hoje));
  const em7 = somarDias(hoje, 7);
  const semana = abertas.filter((t) => t.prazo && t.prazo >= hoje && t.prazo <= em7);
  const desde30 = somarDias(hoje, -30);
  const dataConclusao = (t) => (t.concluida_em ? hojeISO(new Date(t.concluida_em)) : null);
  const feitas30 = feitas.filter((t) => (dataConclusao(t) || '') >= desde30);

  // Entregues no prazo (das concluídas nos últimos 30 dias que tinham prazo)
  const comPrazo = feitas30.filter((t) => t.prazo && dataConclusao(t));
  const noPrazo = comPrazo.filter((t) => dataConclusao(t) <= t.prazo).length;
  const pctNoPrazo = comPrazo.length ? Math.round((noPrazo / comPrazo.length) * 100) : null;

  const total = tarefas.length;
  const pctFeito = total ? Math.round((feitas.length / total) * 100) : 0;

  const porStatus = STATUS.map((s) => ({ ...s, n: tarefas.filter((t) => t.status === s.nome).length }));
  const porPrioridade = PRIORIDADES.map((p) => ({ ...p, n: abertas.filter((t) => t.prioridade === p.nome).length }));

  // Carga por pessoa (só quem tem tarefa aberta), da maior para a menor
  const pessoas = [...equipe, { user_id: null, nome: 'Sem responsável' }]
    .map((p) => {
      const minhas = abertas.filter((t) => (t.responsavel || null) === p.user_id);
      return {
        ...p,
        abertas: minhas.length,
        atrasadas: minhas.filter((t) => atrasada(t, hoje)).length,
        porStatus: STATUS.filter((s) => s.nome !== 'Feito').map((s) => ({ ...s, n: minhas.filter((t) => t.status === s.nome).length })),
      };
    })
    .filter((p) => p.abertas > 0)
    .sort((a, b) => b.abertas - a.abertas);
  const maiorCarga = Math.max(1, ...pessoas.map((p) => p.abertas));

  // Progresso de cada grupo
  const porGrupo = grupos.map((g) => {
    const doGrupo = tarefas.filter((t) => t.grupo_id === g.id);
    const ok = doGrupo.filter((t) => t.status === 'Feito').length;
    return { ...g, total: doGrupo.length, feitas: ok, atrasadas: doGrupo.filter((t) => atrasada(t, hoje)).length, pct: doGrupo.length ? Math.round((ok / doGrupo.length) * 100) : 0 };
  });

  // Concluídas por semana (últimas 8 semanas, da mais antiga para a atual)
  const atual = inicioSemana(hoje);
  const semanas = Array.from({ length: 8 }, (_, i) => {
    const ini = somarDias(atual, -7 * (7 - i));
    const fim = somarDias(ini, 6);
    const n = feitas.filter((t) => {
      const d = dataConclusao(t);
      return d && d >= ini && d <= fim;
    }).length;
    const [, m, d] = ini.split('-');
    return { ini, rotulo: `${d}/${m}`, n, atual: i === 7 };
  });
  const maiorSemana = Math.max(1, ...semanas.map((s) => s.n));

  // Próximos prazos: atrasadas primeiro, depois os próximos 7 dias
  const proximos = [...atrasadas.sort((a, b) => (a.prazo < b.prazo ? -1 : 1)), ...semana.sort((a, b) => (a.prazo < b.prazo ? -1 : 1))].slice(0, 7);

  return {
    total,
    abertas: abertas.length,
    atrasadas: atrasadas.length,
    semana: semana.length,
    feitas30: feitas30.length,
    travadas: abertas.filter((t) => t.status === 'Travado').length,
    pctFeito,
    pctNoPrazo,
    porStatus,
    porPrioridade,
    pessoas,
    maiorCarga,
    porGrupo,
    semanas,
    maiorSemana,
    proximos,
  };
}

// ---------------------------------------------------------------- Liderança

// Saúde de uma área a partir das tarefas atrasadas
export function saudeArea(abertas, atrasadas, total) {
  if (!total) return { nome: 'Sem tarefas', cor: 'gray' };
  if (!atrasadas) return { nome: 'Em dia', cor: 'green' };
  if (atrasadas <= 3 && atrasadas / Math.max(1, abertas) <= 0.2) return { nome: 'Atenção', cor: 'amber' };
  return { nome: 'Crítico', cor: 'coral' };
}

// Concluídas por semana, separadas por setor (gráfico empilhado da liderança)
export function semanasPorSetor(tarefas, slugs, hoje) {
  const atual = inicioSemana(hoje);
  const semanas = Array.from({ length: 8 }, (_, i) => {
    const ini = somarDias(atual, -7 * (7 - i));
    const fim = somarDias(ini, 6);
    const porSetor = Object.fromEntries(slugs.map((s) => [s, 0]));
    tarefas.forEach((t) => {
      if (t.status !== 'Feito' || !t.concluida_em) return;
      const d = hojeISO(new Date(t.concluida_em));
      if (d >= ini && d <= fim && t.setor in porSetor) porSetor[t.setor] += 1;
    });
    const n = Object.values(porSetor).reduce((a, b) => a + b, 0);
    const [, m, d] = ini.split('-');
    return { ini, rotulo: `${d}/${m}`, porSetor, n, atual: i === 7 };
  });
  return { semanas, maior: Math.max(1, ...semanas.map((s) => s.n)) };
}

// Dias de atraso de uma tarefa
export function diasAtraso(prazo, hoje) {
  const a = new Date(prazo + 'T12:00:00Z');
  const b = new Date(hoje + 'T12:00:00Z');
  return Math.round((b - a) / 86400000);
}
