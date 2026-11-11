// Checklist do onboarding de clientes.
// Baseado no "Onboarding de Clientes" do Notion da agência, adaptado para a Capital Upgrade.
// Para mudar tarefas, mensagens ou etapas, edite só este arquivo.
// Atenção: a chave de cada tarefa é "etapa-seção-item". Se reordenar itens,
// as tarefas já marcadas dos clientes podem trocar de lugar.

export const ETAPAS = [
  {
    nome: 'Entrada',
    cor: 'blue',
    resp: 'Responsabilidade do Sucesso do Cliente',
    desc: 'Conferir o que o Comercial passou e preparar o cliente para a reunião de onboarding.',
    secoes: [
      ['Conferir a passagem de bastão do Comercial', [
        'Cliente cadastrado na central',
        'Contrato e proposta anexados no dossiê',
        'Gravações da call de venda anexadas',
        'Pasta do cliente criada no Drive',
      ]],
      ['Boas-vindas', [
        'Mandar áudio de boas-vindas no WhatsApp, com muita animação',
        'Marcar a reunião de onboarding e enviar o convite no calendário',
      ]],
      ['Estudar o cliente', [
        'Assistir às gravações da venda',
        'Ler a proposta',
        'Olhar o site e as redes sociais',
        'Se precisar, falar com o Comercial para ter mais detalhes',
      ]],
    ],
    extras: [],
    msgs: [
      ['Boas-vindas no WhatsApp',
        'Seja muito bem-vindo à Capital Upgrade, {nome}! Estamos muito animados para trabalhar com vocês, contem com a gente.\n\nAgora, o próximo passo é agendar a nossa reunião de onboarding. Vocês conseguem no dia [data], às [hora] ou [hora]?'],
    ],
  },
  {
    nome: 'Reunião de onboarding',
    cor: 'violet',
    resp: 'Responsabilidade do Sucesso do Cliente',
    desc: 'Reunião gravada no Meet, seguindo o PPT de onboarding.',
    secoes: [
      ['Antes da reunião', [
        'Preencher a ficha na central: produto, data de início (dia do contrato assinado) e encontros contratados',
        'Conferir que o cliente está na etapa Reunião de onboarding',
        'No dia, enviar a mensagem de recomendações',
      ]],
      ['Na reunião', [
        'Apresentar-se com segurança, evitando falar "eu acho"',
        'Explicar os 3 objetivos da reunião',
        'Apresentar quem vai acompanhar o cliente',
        'Seguir o PPT na ordem do roteiro',
        'Passar as regras de acesso: nome no Zoom igual ao cadastro e os dois e-mails',
        'Mostrar o calendário de encontros',
      ]],
      ['Após a reunião', [
        'Salvar a gravação no dossiê do cliente',
        'Passar o cliente para a etapa Formulário e grupo',
        'Avisar o time no grupo interno',
      ]],
    ],
    extras: [
      ['Os 3 objetivos da reunião', [
        'Preparar o cliente para aproveitar ao máximo o produto',
        'Passar as regras da Capital Upgrade',
        'Coletar as informações da empresa e do time',
      ]],
      ['Roteiro do PPT, nesta ordem', [
        'Introdução e boas-vindas',
        'Apresentação da Capital Upgrade',
        'O produto que ele comprou',
        'Condições contratadas',
        'O que pode e o que não pode',
        'Regras de acesso: nome e e-mails',
        'Calendário de encontros',
        'Próximos passos: formulário, grupo e time',
      ]],
    ],
    msgs: [
      ['Recomendações no dia',
        'Olá, {nome}, tudo bem? Hoje é o dia da nossa reunião de onboarding. Vou te apresentar as regras da Capital Upgrade e como vamos trabalhar juntos.\n\nO link da reunião: [link]\n\nAlgumas recomendações:\n- Garanta uma internet de qualidade\n- Reserve de 30 minutos a 1 hora na agenda\n- De preferência, entre pelo computador\n\nNos vemos às [hora]!'],
    ],
  },
  {
    nome: 'Formulário e grupo',
    cor: 'amber',
    resp: 'Responsabilidade do Sucesso do Cliente',
    desc: 'O cliente preenche o formulário e entra na turma.',
    secoes: [
      ['Formulário', [
        'Enviar o formulário de entrada',
        'Cliente preencher (a resposta cai sozinha no dossiê)',
        'Conferir os fornecedores que ele busca e o cliente ideal dele',
      ]],
      ['Grupo', [
        'Incluir no grupo do WhatsApp da turma',
        'Pedir para se apresentar no grupo',
        'Informar em qual módulo a turma está',
      ]],
    ],
    extras: [],
    msgs: [
      ['Envio do formulário',
        '{nome}, segue o formulário de entrada da Capital Upgrade:\n{link_formulario}\n\nEle nos ajuda a conhecer melhor a sua empresa e a conectar você com outros mentorados.'],
    ],
  },
  {
    nome: 'Time e acessos',
    cor: 'coral',
    resp: 'Responsabilidade do Sucesso do Cliente',
    desc: 'Cadastrar quem vai participar e liberar os acessos.',
    secoes: [
      ['Time', [
        'Pedir nome completo, telefone, e-mails (celular e computador) e cargo de cada pessoa',
        'Cadastrar todos na aba Time do cliente',
      ]],
      ['Acessos', [
        'Liberar os e-mails na plataforma da mentoria',
        'Liberar o acesso ao Zoom',
        'Confirmar que todos vão entrar com o nome do cadastro',
      ]],
    ],
    extras: [],
    msgs: [
      ['Pedido do time',
        '{nome}, para liberar o acesso do seu time, me passa de cada pessoa: nome completo, telefone, cargo e os e-mails que ela usa no celular e no computador.\n\nSó consigo liberar quem estiver cadastrado.'],
    ],
  },
  {
    nome: 'Primeiro encontro',
    cor: 'teal',
    resp: 'Responsabilidade do Sucesso do Cliente',
    desc: 'Garantir que o cliente e o time estejam no primeiro encontro.',
    secoes: [
      ['Antes', [
        'Conferir a data do próximo encontro na aba Encontros',
        'Avisar 3 dias antes e no dia, com o link e o material',
      ]],
      ['No encontro', [
        'Fazer a chamada na central',
        'Conferir quem entrou no Zoom sem cadastro',
      ]],
      ['Depois', [
        'Falar com quem faltou',
      ]],
    ],
    extras: [],
    msgs: [
      ['Lembrete do encontro',
        '{nome}, nosso encontro é [dia] às [hora]. O link e o material estão no grupo.\n\nLembre de entrar com o nome do cadastro para eu liberar o seu acesso.'],
    ],
  },
  {
    nome: 'Ativo',
    cor: 'green',
    resp: 'Responsabilidade do Sucesso do Cliente',
    desc: 'Onboarding concluído. O cliente segue para o acompanhamento.',
    secoes: [
      ['Ações finais', [
        'Conferir que o status do cliente está Ativo',
        'Agendar o primeiro C-Sat (bimestral)',
        'Registrar o perfil do cliente na ficha',
      ]],
    ],
    extras: [],
    msgs: [],
  },
];

export function chave(e, s, i) {
  return `${e}-${s}-${i}`;
}

export function totalTarefas() {
  let t = 0;
  ETAPAS.forEach((et) => et.secoes.forEach(([, itens]) => (t += itens.length)));
  return t;
}

export function contarPorEtapa(feitas) {
  // feitas: Set de chaves
  return ETAPAS.map((et, e) => {
    let total = 0;
    let ok = 0;
    et.secoes.forEach(([, itens], s) =>
      itens.forEach((_, i) => {
        total++;
        if (feitas.has(chave(e, s, i))) ok++;
      })
    );
    return { ok, total };
  });
}

export const REGRAS = {
  pode: [
    'Levar o time cadastrado nos encontros',
    'Acessar as gravações e os materiais',
    'Tirar dúvidas com o Sucesso do Cliente',
  ],
  naoPode: [
    'Entrar no Zoom com nome diferente do cadastro',
    'Usar e-mail que não foi informado',
    'Levar quem não está no time cadastrado',
  ],
};
