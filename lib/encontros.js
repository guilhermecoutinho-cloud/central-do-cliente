// Calcula o resumo de encontros de um cliente.
// Regra: todo encontro do produto que já aconteceu desde a data de início conta como "usado"
// (o cliente indo ou não). Saldo = contratados - usados. Renovar soma no "contratados".

export function inicioDoCliente(c) {
  if (c.data_inicio) return new Date(c.data_inicio + 'T00:00:00-03:00');
  return new Date(c.criado_em);
}

// presencaCliente: linhas da view presenca_cliente { encontro_id, cliente_id, presente }
export function resumoEncontros(c, encontros, presencaCliente, agora = new Date()) {
  const inicio = inicioDoCliente(c);
  const doProduto = encontros
    .filter((e) => e.produto === c.produto && new Date(e.data) >= inicio)
    .sort((a, b) => new Date(a.data) - new Date(b.data));
  const passados = doProduto.filter((e) => new Date(e.data) <= agora);
  const futuros = doProduto.filter((e) => new Date(e.data) > agora);

  const doCliente = presencaCliente.filter((p) => p.cliente_id === c.id);
  const presentesEm = new Set(doCliente.filter((p) => p.presente).map((p) => p.encontro_id));
  const comChamada = new Set(doCliente.map((p) => p.encontro_id));

  const usados = passados.length;
  const participou = passados.filter((e) => presentesEm.has(e.id)).length;
  const contratados = c.encontros_contratados || 0;
  const saldo = Math.max(contratados - usados, 0);

  let ultimo = 'Ainda não começou';
  let ultimoTipo = 'neutro';
  const ult = passados[passados.length - 1];
  if (ult) {
    if (presentesEm.has(ult.id)) {
      ultimo = 'Presente';
      ultimoTipo = 'ok';
    } else if (comChamada.has(ult.id)) {
      ultimo = 'Faltou';
      ultimoTipo = 'falta';
    } else {
      ultimo = 'Sem chamada';
    }
  }

  let faltasSeguidas = 0;
  for (let i = passados.length - 1; i >= 0; i--) {
    const e = passados[i];
    if (!comChamada.has(e.id) || presentesEm.has(e.id)) break;
    faltasSeguidas++;
  }

  return {
    usados,
    participou,
    faltou: passados.filter((e) => comChamada.has(e.id) && !presentesEm.has(e.id)).length,
    contratados,
    saldo,
    ultimo,
    ultimoTipo,
    proximo: futuros[0] || null,
    passados,
    futuros,
    presentesEm,
    comChamada,
    faltasSeguidas,
  };
}
