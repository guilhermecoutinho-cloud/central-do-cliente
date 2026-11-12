-- =====================================================================
-- Central da Empresa · setores, acesso por usuário e tarefas (estilo Monday)
-- Rode UMA vez no Supabase > SQL Editor > New query > Run.
-- Pode rodar de novo sem quebrar. Não apaga nenhum dado.
-- Quem já está na equipe recebe acesso ao Sucesso do Cliente, para ninguém perder acesso.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Acesso por setor
-- ---------------------------------------------------------------------
create table if not exists public.equipe_setores (
  user_id uuid not null references public.equipe(user_id) on delete cascade,
  setor   text not null check (setor in ('sucesso', 'marketing', 'vendas', 'eventos', 'financeiro')),
  primary key (user_id, setor)
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.equipe where user_id = auth.uid() and papel = 'admin');
$$;

create or replace function public.tem_setor(p_setor text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.equipe where user_id = auth.uid() and papel = 'admin')
      or exists (select 1 from public.equipe_setores where user_id = auth.uid() and setor = p_setor);
$$;

insert into public.equipe_setores (user_id, setor)
select user_id, 'sucesso' from public.equipe
on conflict do nothing;

alter table public.equipe_setores enable row level security;
drop policy if exists "ve os proprios setores" on public.equipe_setores;
create policy "ve os proprios setores" on public.equipe_setores
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "admin gerencia setores" on public.equipe_setores;
create policy "admin gerencia setores" on public.equipe_setores
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Dados dos clientes passam a exigir acesso ao setor Sucesso do Cliente
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['clientes','membros','acessos','encontros','presencas','onboarding_tarefas','acompanhamentos','arquivos','assessment_perguntas','assessment_respostas','cashback_movimentos']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "equipe acessa" on public.%I', t);
      execute format('create policy "equipe acessa" on public.%I for all to authenticated using ((select public.tem_setor(''sucesso''))) with check ((select public.tem_setor(''sucesso'')))', t);
    end if;
  end loop;
end $$;

drop policy if exists "equipe arquivos" on storage.objects;
create policy "equipe arquivos" on storage.objects
  for all to authenticated
  using (bucket_id = 'arquivos' and (select public.tem_setor('sucesso')))
  with check (bucket_id = 'arquivos' and (select public.tem_setor('sucesso')));

-- ---------------------------------------------------------------------
-- Tarefas
-- ---------------------------------------------------------------------
create table if not exists public.tarefa_grupos (
  id        uuid primary key default gen_random_uuid(),
  setor     text not null check (setor in ('sucesso', 'marketing', 'vendas', 'eventos', 'financeiro')),
  nome      text not null,
  cor       text not null default 'green',
  ordem     int  not null default 0,
  criado_em timestamptz not null default now()
);
create index if not exists tarefa_grupos_setor_idx on public.tarefa_grupos (setor, ordem);

create table if not exists public.tarefas (
  id            uuid primary key default gen_random_uuid(),
  setor         text not null check (setor in ('sucesso', 'marketing', 'vendas', 'eventos', 'financeiro')),
  grupo_id      uuid references public.tarefa_grupos(id) on delete cascade,
  titulo        text not null,
  descricao     text,
  status        text not null default 'Não iniciado' check (status in ('Não iniciado', 'Em andamento', 'Travado', 'Feito')),
  prioridade    text not null default 'Média' check (prioridade in ('Baixa', 'Média', 'Alta', 'Crítica')),
  responsavel   uuid references public.equipe(user_id) on delete set null,
  prazo         date,
  criado_por    uuid default auth.uid(),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  concluida_em  timestamptz
);
create index if not exists tarefas_setor_idx       on public.tarefas (setor, criado_em);
create index if not exists tarefas_grupo_idx       on public.tarefas (grupo_id);
create index if not exists tarefas_responsavel_idx on public.tarefas (responsavel, status, prazo);

create table if not exists public.tarefa_subtarefas (
  id        uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.tarefas(id) on delete cascade,
  texto     text not null,
  feito     boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists tarefa_subtarefas_idx on public.tarefa_subtarefas (tarefa_id, criado_em);

create table if not exists public.tarefa_atualizacoes (
  id         uuid primary key default gen_random_uuid(),
  tarefa_id  uuid not null references public.tarefas(id) on delete cascade,
  autor      uuid default auth.uid(),
  autor_nome text,
  texto      text not null,
  criado_em  timestamptz not null default now()
);
create index if not exists tarefa_atualizacoes_idx on public.tarefa_atualizacoes (tarefa_id, criado_em desc);

create table if not exists public.tarefa_atividade (
  id         uuid primary key default gen_random_uuid(),
  tarefa_id  uuid not null references public.tarefas(id) on delete cascade,
  autor_nome text,
  texto      text not null,
  criado_em  timestamptz not null default now()
);
create index if not exists tarefa_atividade_idx on public.tarefa_atividade (tarefa_id, criado_em desc);

create or replace function public.pode_tarefa(p_tarefa uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select public.tem_setor(t.setor) from public.tarefas t where t.id = p_tarefa), false);
$$;

alter table public.tarefa_grupos enable row level security;
alter table public.tarefas enable row level security;
alter table public.tarefa_subtarefas enable row level security;
alter table public.tarefa_atualizacoes enable row level security;
alter table public.tarefa_atividade enable row level security;

drop policy if exists "setor acessa" on public.tarefa_grupos;
create policy "setor acessa" on public.tarefa_grupos for all to authenticated
  using (public.tem_setor(setor)) with check (public.tem_setor(setor));

drop policy if exists "setor acessa" on public.tarefas;
create policy "setor acessa" on public.tarefas for all to authenticated
  using (public.tem_setor(setor)) with check (public.tem_setor(setor));

drop policy if exists "setor acessa" on public.tarefa_subtarefas;
create policy "setor acessa" on public.tarefa_subtarefas for all to authenticated
  using (public.pode_tarefa(tarefa_id)) with check (public.pode_tarefa(tarefa_id));

drop policy if exists "setor acessa" on public.tarefa_atualizacoes;
create policy "setor acessa" on public.tarefa_atualizacoes for all to authenticated
  using (public.pode_tarefa(tarefa_id)) with check (public.pode_tarefa(tarefa_id));

drop policy if exists "setor acessa" on public.tarefa_atividade;
create policy "setor acessa" on public.tarefa_atividade for all to authenticated
  using (public.pode_tarefa(tarefa_id)) with check (public.pode_tarefa(tarefa_id));

-- Grupos iniciais de cada setor (só cria se o setor ainda não tiver nenhum)
insert into public.tarefa_grupos (setor, nome, cor, ordem)
select s.setor, g.nome, g.cor, g.ordem
from (values ('sucesso'), ('marketing'), ('vendas'), ('eventos'), ('financeiro')) as s(setor)
cross join (values ('Esta semana', 'green', 1), ('Próxima semana', 'blue', 2), ('Concluído', 'gray', 3)) as g(nome, cor, ordem)
where not exists (select 1 from public.tarefa_grupos x where x.setor = s.setor);
