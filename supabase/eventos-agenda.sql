-- =====================================================================
-- Eventos: agenda, briefing de cada evento e os eventos de novembro e dezembro/2026
-- (da planilha "Calendário Completo 2026 Capital Up Grade").
-- Rode no Supabase > SQL Editor, depois do eventos-rh.sql. Pode rodar de novo sem problema:
-- evento que já existe (mesmo dia e mesmo nome) não é duplicado.
-- =====================================================================

-- 1. Briefing do evento
alter table public.eventos add column if not exists horario text;
alter table public.eventos add column if not exists responsavel uuid references auth.users(id) on delete set null;
alter table public.eventos add column if not exists briefing jsonb not null default '{}'::jsonb;
-- briefing: {objetivo, publico, oferta, palestrantes, programacao, estrutura, links, observacoes}

-- 2. Eventos de novembro e dezembro
do $$
declare
  r record;
  v_id uuid;
  completo jsonb := '{
    "vendas": ["Definir meta de vendas do evento", "Separar a lista de leads e o ICP", "Ligações de convite", "Ligações de confirmação (D-2 e D-1)", "Pitch e oferta do evento alinhados", "Material e condições para o time comercial", "Atendimento e fechamentos no dia", "Follow-up de quem não fechou no evento"],
    "marketing": ["Identidade visual do evento", "Página de inscrição / Sympla", "Criativos de tráfego pago", "Conteúdo orgânico (antecipação)", "Grupo de WhatsApp e mensagem de boas-vindas", "Trilha de conteúdo do grupo", "Disparos: convite, faltam 2 dias, é amanhã, é hoje", "Fotos e vídeos no dia", "Pós-evento: aftermovie e depoimentos"],
    "eventos": ["Local e data confirmados", "Sala montada (cadeiras, palco, decoração)", "Som, telão e internet testados", "Palestrantes confirmados e roteiro do dia", "Coffee break e almoço", "Credenciamento e lista de presença", "Materiais impressos e brindes", "Checklist da sala no dia"],
    "financeiro": ["Orçamento do evento aprovado", "Pagamento de fornecedores (buffet, local, equipamentos)", "Links de pagamento e maquininha prontos", "Conferência das vendas do evento", "Relatório de resultado (receita x custo)"]
  }';
  enxuto jsonb := '{
    "vendas": ["Lista de convidados confirmada"],
    "marketing": ["Convite / divulgação", "Grupo ou lembrete de WhatsApp", "Lembrete no dia"],
    "eventos": ["Local ou link confirmado", "Estrutura e materiais prontos"],
    "financeiro": ["Custos aprovados"]
  }';
  lista jsonb;
  s text;
  i int;
begin
  for r in
    select * from (values
      -- nome, tipo, inicio, fim, horario, local, procura (regex no nome), checklist, observações, palestrantes
      ('Sala Secreta', 'Sala Secreta', '2026-11-04', null, '9h às 17h', null, 'sala secreta', 'completo', null, null),
      ('Mentoria de Gestão Aplicada (encontro 03/12)', 'MGA', '2026-11-09', null, null, null, 'mentoria|\mmga\M', 'enxuto', null, null),
      ('GC – Gestão do Crescimento', 'GC', '2026-11-10', '2026-11-11', '9h às 19h', null, '\mgc\M|crescimento', 'completo', null, null),
      ('VT – Alphaville', 'Outro', '2026-11-12', null, null, 'Alphaville', '\mvt\M', 'enxuto', null, null),
      ('Alavanca do Crescimento (on-line)', 'Alavanca', '2026-11-16', null, '19h30 às 21h30', 'On-line', 'alavanc', 'enxuto', 'Fazer o grupo de WhatsApp.', null),
      ('Ela Lidera (Filantropia)', 'Ela Lidera', '2026-11-17', '2026-11-18', '9h às 19h', null, 'ela lidera', 'completo', null, null),
      ('Célula na casa da Lilian', 'Interno', '2026-11-19', null, '19h', 'Casa da Lilian', 'c[eé]lula', 'enxuto', null, null),
      ('Máquina de Vendas', 'Máquina de Vendas', '2026-11-23', null, null, null, 'm[aá]quina', 'completo', null, null),
      ('Mentoria de Gestão Aplicada (encontro 04/12)', 'MGA', '2026-11-23', null, null, null, 'mentoria|\mmga\M', 'enxuto', null, null),
      ('Aniversariantes do mês', 'Interno', '2026-11-23', null, null, null, 'anivers', 'enxuto', null, null),
      ('GI Alphaville', 'GI', '2026-11-24', '2026-11-25', '9h às 19h', 'Alphaville', '\mgi\M|gest[aã]o inteligente', 'completo', 'A Lilian tem mentoria à noite: precisamos colocar alguém para encerrar o evento.', null),
      ('Planejamento Estratégico – Alphaville', 'Interno', '2026-11-26', '2026-11-27', null, 'Alphaville', 'planejamento', 'enxuto', null, null),
      ('Alavanca do Crescimento (on-line)', 'Alavanca', '2026-12-01', null, '19h30 às 21h30', 'On-line', 'alavanc', 'enxuto', null, null),
      ('Sala Secreta', 'Sala Secreta', '2026-12-02', null, '14h às 19h', null, 'sala secreta', 'completo', null, null),
      ('Máquina de Vendas', 'Máquina de Vendas', '2026-12-04', null, null, null, 'm[aá]quina', 'completo', null, null),
      ('Festa de confraternização Ambição', 'Ambição', '2026-12-05', null, null, null, 'confraterniza', 'enxuto', null, null),
      ('GC – Gestão do Crescimento', 'GC', '2026-12-07', '2026-12-08', '9h às 19h', null, '\mgc\M|crescimento', 'completo', null, null),
      ('Podcast O Padrinho (Lásaro e Thiago Concer)', 'Podcast', '2026-12-09', null, null, null, 'pod ?cast|padrinho', 'completo', null, 'Lásaro do Carmo e Thiago Concer'),
      ('Máquina de Vendas (pré-reserva)', 'Máquina de Vendas', '2026-12-11', null, null, null, 'm[aá]quina', 'completo', 'Pré-reserva: pode ser que precise mudar a data.', null),
      ('Evento Eco X (a confirmar)', 'Outro', '2026-12-12', null, null, null, 'eco ?x', 'enxuto', 'Evento ainda a confirmar.', null),
      ('GI – Gestão Inteligente', 'GI', '2026-12-14', '2026-12-15', '9h às 19h', null, '\mgi\M|gest[aã]o inteligente', 'completo', null, null),
      ('Mentoria de Gestão Aplicada', 'MGA', '2026-12-14', null, null, null, 'mentoria|\mmga\M', 'enxuto', 'Trazer convidado.', null),
      ('Ela Lidera (Filantropia)', 'Ela Lidera', '2026-12-18', '2026-12-19', '9h às 19h', null, 'ela lidera', 'completo', null, null)
    ) as t(nome, tipo, inicio, fim, horario, local, procura, checklist, obs, palestrantes)
  loop
    select id into v_id from public.eventos
    where data_inicio = r.inicio::date and nome ~* r.procura
    order by criado_em limit 1;

    if v_id is null then
      insert into public.eventos (nome, tipo, data_inicio, data_fim, horario, local, briefing)
      values (
        r.nome, r.tipo, r.inicio::date, r.fim::date, r.horario, r.local,
        jsonb_strip_nulls(jsonb_build_object('observacoes', r.obs, 'palestrantes', r.palestrantes))
      )
      returning id into v_id;

      -- Checklist de cada setor (completo para os eventos grandes, enxuto para encontros internos e on-line)
      lista := case when r.checklist = 'completo' then completo else enxuto end;
      for s in select jsonb_object_keys(lista) loop
        for i in 0 .. jsonb_array_length(lista -> s) - 1 loop
          insert into public.evento_itens (evento_id, setor, titulo, ordem)
          values (v_id, s, lista -> s ->> i, i);
        end loop;
      end loop;
    else
      -- Já existia: só completa o que estiver vazio
      update public.eventos e set
        tipo = coalesce(e.tipo, r.tipo),
        data_fim = coalesce(e.data_fim, r.fim::date),
        horario = coalesce(e.horario, r.horario),
        local = coalesce(e.local, r.local),
        briefing = jsonb_strip_nulls(jsonb_build_object('observacoes', r.obs, 'palestrantes', r.palestrantes)) || e.briefing
      where e.id = v_id;
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
