-- =====================================================================
-- Eventos (checklist de cada setor por evento) + setor de RH
-- Rode uma vez no Supabase > SQL Editor. Pode rodar de novo sem problema.
-- Precisa ter rodado antes: schema.sql e central-empresa.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Setor de RH: entra na lista de setores aceitos
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tabela, c.conname
    from pg_constraint c
    where c.contype = 'c'
      and c.conrelid in ('public.equipe_setores'::regclass, 'public.tarefa_grupos'::regclass, 'public.tarefas'::regclass)
      and pg_get_constraintdef(c.oid) ilike '%setor%'
  loop
    execute format('alter table %s drop constraint %I', r.tabela, r.conname);
  end loop;
end $$;

alter table public.equipe_setores add constraint equipe_setores_setor_check
  check (setor in ('sucesso', 'marketing', 'vendas', 'eventos', 'financeiro', 'rh'));
alter table public.tarefa_grupos add constraint tarefa_grupos_setor_check
  check (setor in ('sucesso', 'marketing', 'vendas', 'eventos', 'financeiro', 'rh'));
alter table public.tarefas add constraint tarefas_setor_check
  check (setor in ('sucesso', 'marketing', 'vendas', 'eventos', 'financeiro', 'rh'));

insert into public.tarefa_grupos (setor, nome, cor, ordem)
select 'rh', g.nome, g.cor, g.ordem
from (values ('Esta semana', 'green', 1), ('Próxima semana', 'blue', 2), ('Concluído', 'gray', 3)) as g(nome, cor, ordem)
where not exists (select 1 from public.tarefa_grupos x where x.setor = 'rh');

-- ---------------------------------------------------------------------
-- 2. Eventos
-- ---------------------------------------------------------------------
create table if not exists public.eventos (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  tipo             text,                 -- GI, GC, MGA, Ambição, Sniper, Máquina de Vendas...
  data_inicio      date,
  data_fim         date,
  local            text,
  -- Avaliação depois do evento ("julgamento")
  avaliacao_nota   int check (avaliacao_nota between 0 and 10),
  avaliacao_ok     text,                 -- o que funcionou
  avaliacao_faltou text,                 -- o que faltou / deixou de ter
  avaliado_por     text,
  avaliado_em      timestamptz,
  criado_em        timestamptz not null default now()
);
create index if not exists eventos_data_idx on public.eventos (data_inicio);

-- Checklist de cada setor no evento
create table if not exists public.evento_itens (
  id            uuid primary key default gen_random_uuid(),
  evento_id     uuid not null references public.eventos(id) on delete cascade,
  setor         text not null check (setor in ('sucesso', 'marketing', 'vendas', 'eventos', 'financeiro', 'rh')),
  titulo        text not null,
  estado        text not null default 'pendente' check (estado in ('pendente', 'feito', 'faltou')),
  responsavel   uuid references auth.users(id) on delete set null,
  prazo         date,
  observacao    text,
  ordem         int not null default 0,
  atualizado_por text,
  atualizado_em timestamptz not null default now()
);
create index if not exists evento_itens_evento_idx on public.evento_itens (evento_id, setor, ordem);

alter table public.eventos enable row level security;
alter table public.evento_itens enable row level security;

-- Todo mundo do time vê os eventos; quem cria e muda é o administrador ou o setor de Eventos
drop policy if exists "time ve" on public.eventos;
create policy "time ve" on public.eventos for select to authenticated using ((select public.is_equipe()));
drop policy if exists "eventos gerencia" on public.eventos;
create policy "eventos gerencia" on public.eventos for all to authenticated
  using ((select public.tem_setor('eventos'))) with check ((select public.tem_setor('eventos')));

-- Cada setor vê e marca o próprio checklist (o administrador vê todos)
drop policy if exists "setor acessa" on public.evento_itens;
create policy "setor acessa" on public.evento_itens for all to authenticated
  using (public.tem_setor(setor)) with check (public.tem_setor(setor));

-- ---------------------------------------------------------------------
-- 3. RH: organograma, avaliações e reuniões
-- ---------------------------------------------------------------------
create table if not exists public.rh_pessoas (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  cargo     text,
  area      text,                         -- Diretoria, Marketing, Vendas...
  gestor_id uuid references public.rh_pessoas(id) on delete set null,
  email     text,
  telefone  text,
  admissao  date,
  ordem     int not null default 0,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.rh_avaliacoes (
  id            uuid primary key default gen_random_uuid(),
  pessoa_id     uuid not null references public.rh_pessoas(id) on delete cascade,
  periodo       text not null,            -- ex.: 2º semestre 2026
  avaliador     text,
  notas         jsonb not null default '{}'::jsonb,  -- competência -> nota de 1 a 5
  pontos_fortes text,
  desenvolver   text,
  plano_acao    text,
  data          date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  criado_em     timestamptz not null default now()
);
create index if not exists rh_avaliacoes_pessoa_idx on public.rh_avaliacoes (pessoa_id, data desc);

create table if not exists public.rh_reunioes (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  tipo          text not null default 'Equipe',   -- 1:1, Equipe, Feedback, Alinhamento, Liderança
  data          timestamptz not null,
  pessoa_id     uuid references public.rh_pessoas(id) on delete set null,
  participantes text,
  pauta         text,
  ata           text,                     -- decisões e combinados
  criado_em     timestamptz not null default now()
);
create index if not exists rh_reunioes_data_idx on public.rh_reunioes (data desc);

alter table public.rh_pessoas enable row level security;
alter table public.rh_avaliacoes enable row level security;
alter table public.rh_reunioes enable row level security;

drop policy if exists "rh acessa" on public.rh_pessoas;
create policy "rh acessa" on public.rh_pessoas for all to authenticated
  using ((select public.tem_setor('rh'))) with check ((select public.tem_setor('rh')));
drop policy if exists "rh acessa" on public.rh_avaliacoes;
create policy "rh acessa" on public.rh_avaliacoes for all to authenticated
  using ((select public.tem_setor('rh'))) with check ((select public.tem_setor('rh')));
drop policy if exists "rh acessa" on public.rh_reunioes;
create policy "rh acessa" on public.rh_reunioes for all to authenticated
  using ((select public.tem_setor('rh'))) with check ((select public.tem_setor('rh')));

notify pgrst, 'reload schema';
