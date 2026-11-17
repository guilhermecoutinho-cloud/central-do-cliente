-- =====================================================================
-- Marketing > Social mídia > Calendário de conteúdo
-- Rode uma vez no Supabase > SQL Editor. Pode rodar de novo sem problema.
-- =====================================================================

create table if not exists public.conteudo_calendarios (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null default 'Calendário de conteúdo',
  subtitulo  text not null default 'Marketing · Orgânico',
  inicio     date not null,
  fim        date not null,
  funil      jsonb not null default '[]'::jsonb,   -- ["Chamada", "Prova social", ...]
  regras     jsonb not null default '[]'::jsonb,   -- [{"rotulo": "Por semana", "texto": "2 Reels + 2 carrosséis"}]
  eventos    jsonb not null default '[]'::jsonb,   -- [{"nome": "GC", "datas": "07–08/12"}]
  semanas    jsonb not null default '{}'::jsonb,   -- rótulo de cada semana: {"2026-11-17": "GC · Podcast · Black"}
  nota       text,
  criado_por text,
  criado_em  timestamptz not null default now(),
  check (fim >= inicio)
);
alter table public.conteudo_calendarios add column if not exists semanas jsonb not null default '{}'::jsonb;
create index if not exists conteudo_calendarios_periodo_idx on public.conteudo_calendarios (inicio, fim);

create table if not exists public.conteudo_posts (
  id            uuid primary key default gen_random_uuid(),
  calendario_id uuid not null references public.conteudo_calendarios(id) on delete cascade,
  data          date not null,
  data_fim      date,                 -- para "07–08/12", "10–12/12"
  campanha      text,                 -- GC, Podcast, Black, Alavanca...
  descricao     text not null,
  formato       text,                 -- Reel, Carrossel, Stories + Reels...
  link          text,                 -- link do post/anúncio publicado
  feito         boolean not null default false,
  feito_em      timestamptz,
  responsavel   uuid references auth.users(id) on delete set null,
  ordem         int not null default 0,
  criado_em     timestamptz not null default now()
);
create index if not exists conteudo_posts_cal_idx on public.conteudo_posts (calendario_id, data, ordem);
create index if not exists conteudo_posts_data_idx on public.conteudo_posts (data, data_fim) where not feito;

alter table public.conteudo_calendarios enable row level security;
alter table public.conteudo_posts enable row level security;

drop policy if exists "marketing acessa" on public.conteudo_calendarios;
create policy "marketing acessa" on public.conteudo_calendarios for all to authenticated
  using ((select public.tem_setor('marketing'))) with check ((select public.tem_setor('marketing')));
drop policy if exists "marketing acessa" on public.conteudo_posts;
create policy "marketing acessa" on public.conteudo_posts for all to authenticated
  using ((select public.tem_setor('marketing'))) with check ((select public.tem_setor('marketing')));

-- ---------------------------------------------------------------------
-- Primeiro calendário (17/11 a 19/12/2026), igual ao que o marketing montou.
-- Só entra se ainda não existir nenhum calendário.
-- ---------------------------------------------------------------------
do $$
declare
  cal uuid;
begin
  if exists (select 1 from public.conteudo_calendarios) then
    return;
  end if;

  insert into public.conteudo_calendarios (titulo, subtitulo, inicio, fim, funil, regras, eventos, semanas, nota, criado_por)
  values (
    'Calendário de conteúdo', 'Marketing · Orgânico', '2026-11-17', '2026-12-19',
    '["Chamada", "Prova social", "Contagem regressiva", "Cobertura ao vivo", "Cortes e depoimentos", "Prova do próximo evento"]',
    '[{"rotulo": "Por semana", "texto": "2 Reels + 2 carrosséis"},
      {"rotulo": "Stories", "texto": "todo dia, 5 a 8 telas com enquete, caixinha ou link"},
      {"rotulo": "Todo post", "texto": "termina com palavra-chave no ManyChat → Funil Digital"}]',
    '[{"nome": "GC", "datas": "07–08/12"}, {"nome": "Podcast", "datas": "09/12"}, {"nome": "Alavanca", "datas": "01/12"},
      {"nome": "GI", "datas": "14–15/12"}, {"nome": "Ela", "datas": "18–19/12"}]',
    '{"2026-11-17": "GC · Podcast · Black", "2026-11-24": "Alavanca · GC · Black", "2026-12-01": "Alavanca · GC · GI",
      "2026-12-08": "Podcast · GI · Ela Lidera", "2026-12-15": "GI · Ela Lidera"}',
    'Gravar já: 1 dia de captação com a Lilian na semana de 17/11 (5 a 6 vídeos de chamada). Máquina de Vendas fica fora: o conteúdo é do expert do evento e pedir ao Thiago Concer o vídeo de convite até 20/11.',
    'Marketing'
  )
  returning id into cal;

  insert into public.conteudo_posts (calendario_id, data, data_fim, campanha, descricao, formato, ordem)
  select cal, p.data::date, p.data_fim::date, p.campanha, p.descricao, p.formato, p.ordem
  from (values
    ('2026-11-17', null, 'Podcast', 'Anúncio: "Vendedor bonzinho não fica rico", corte do Concer', 'Reel', 1),
    ('2026-11-18', null, 'GC', '5 sinais de que sua gestão comercial travou', 'Carrossel', 2),
    ('2026-11-19', null, 'GC', 'Depoimento de aluno (corte do aftermovie)', 'Reel', 3),
    ('2026-11-20', null, 'Podcast', 'O vendedor que bate meta x o que só é simpático', 'Carrossel', 4),
    ('2026-11-21', null, 'Black', 'Últimos dias: Lilian direto para a câmera', 'Reel', 5),
    ('2026-11-24', null, 'Alavanca', '3 alavancas para crescer em 2027', 'Reel', 6),
    ('2026-11-25', null, 'GC', 'Os números que todo gestor precisa olhar toda semana', 'Carrossel', 7),
    ('2026-11-26', null, 'GC', 'Bastidores + contagem regressiva', 'Stories + Reel', 8),
    ('2026-11-27', null, 'Podcast', 'Convite em vídeo do Concer (collab)', 'Reel collab', 9),
    ('2026-11-28', null, 'Black', 'Último dia: contagem o dia todo', 'Stories', 10),
    ('2026-11-30', null, 'Alavanca', 'É amanhã: link na palavra-chave', 'Stories + Carrossel', 11),
    ('2026-12-01', null, 'Alavanca', 'Cobertura ao vivo + cortes', 'Stories + Reel', 12),
    ('2026-12-02', null, 'GI', 'Gestão inteligente: o que muda com números', 'Carrossel', 13),
    ('2026-12-05', null, 'Podcast', 'Faltam 4 dias: últimos VIPs', 'Reel + Stories', 14),
    ('2026-12-07', '2026-12-08', 'GC', 'Cobertura 2 dias + depoimentos', 'Stories + Reels', 15),
    ('2026-12-09', null, 'Podcast', 'Cobertura ao vivo + gravação', 'Stories', 16),
    ('2026-12-10', '2026-12-12', 'Podcast', '3 cortes do episódio, 1 por dia', 'Reels', 17),
    ('2026-12-11', null, 'GC → GI', 'Aftermovie do GC como prova social', 'Reel', 18),
    ('2026-12-12', null, 'Ela Lidera', 'Mulheres que lideram: depoimento', 'Reel', 19),
    ('2026-12-14', null, 'GI', 'Cobertura ao vivo (dia 1)', 'Stories + Reels', 20),
    ('2026-12-15', null, 'GI', 'Cobertura ao vivo (dia 2) + depoimentos', 'Stories + Reels', 21),
    ('2026-12-16', null, 'Ela Lidera', 'Contagem regressiva + programação', 'Carrossel + Stories', 22),
    ('2026-12-18', '2026-12-19', 'Ela Lidera', 'Cobertura ao vivo', 'Stories + Reels', 23)
  ) as p(data, data_fim, campanha, descricao, formato, ordem);
end;
$$;

notify pgrst, 'reload schema';
