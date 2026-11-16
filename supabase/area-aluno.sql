-- =====================================================================
-- Área do aluno + produtos novos (MGA, Ambição, GI, GC, Sniper)
-- Rode uma vez no Supabase > SQL Editor. Pode rodar de novo sem problema.
-- Precisa ter rodado antes: schema.sql e central-empresa.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Produtos: passam a ser MGA, Ambição, GI, GC e Sniper.
--    Mentoria e Imersão continuam aceitos só para quem já estava cadastrado.
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tabela, c.conname
    from pg_constraint c
    where c.contype = 'c'
      and c.conrelid in ('public.clientes'::regclass, 'public.encontros'::regclass)
      and pg_get_constraintdef(c.oid) ilike '%produto%'
  loop
    execute format('alter table %s drop constraint %I', r.tabela, r.conname);
  end loop;
end $$;

alter table public.clientes add constraint clientes_produto_check
  check (produto in ('MGA', 'Ambição', 'GI', 'GC', 'Sniper', 'Mentoria', 'Imersão'));
alter table public.encontros add constraint encontros_produto_check
  check (produto in ('MGA', 'Ambição', 'GI', 'GC', 'Sniper', 'Mentoria', 'Imersão'));

-- ---------------------------------------------------------------------
-- 2. Treinamentos (as capas que aparecem para o time e para o aluno)
-- ---------------------------------------------------------------------
create table if not exists public.treinamentos (
  id        uuid primary key default gen_random_uuid(),
  sigla     text not null unique,          -- MGA, Ambição, GI, GC, Sniper
  nome      text not null,                 -- nome completo
  descricao text,
  capa_url  text,                          -- imagem da capa (bucket público "capas")
  ordem     int  not null default 0,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

insert into public.treinamentos (sigla, nome, descricao, ordem) values
  ('MGA',    'MGA',                     'Programa MGA da Capital Upgrade.', 1),
  ('Ambição','Ambição em Negócios',     'Encontros do Ambição em Negócios.', 2),
  ('GI',     'Gestão Inteligente',      'Treinamento GI · Gestão Inteligente.', 3),
  ('GC',     'Gestão do Crescimento',   'Treinamento GC · Gestão do Crescimento.', 4),
  ('Sniper', 'Sniper',                  'Treinamento Sniper.', 5)
on conflict (sigla) do nothing;

-- ---------------------------------------------------------------------
-- 3. Quem do time do cliente já fez cada treinamento
-- ---------------------------------------------------------------------
create table if not exists public.aluno_treinamentos (
  membro_id      uuid not null references public.membros(id) on delete cascade,
  treinamento_id uuid not null references public.treinamentos(id) on delete cascade,
  concluido_em   date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  marcado_por    text,
  primary key (membro_id, treinamento_id)
);
create index if not exists aluno_treinamentos_treino_idx on public.aluno_treinamentos (treinamento_id);

-- ---------------------------------------------------------------------
-- 4. Login do aluno: cada pessoa do time do cliente pode ter um usuário
-- ---------------------------------------------------------------------
alter table public.membros add column if not exists user_id uuid unique references auth.users(id) on delete set null;

-- Id do membro (pessoa do time do cliente) ligado ao usuário logado
create or replace function public.meu_membro_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from public.membros where user_id = auth.uid() limit 1;
$$;

-- ---------------------------------------------------------------------
-- 5. Regras de acesso
--    Time (com acesso ao Sucesso do Cliente): vê e muda tudo.
--    Aluno: vê os treinamentos, o próprio cadastro e os próprios checks. Não muda nada.
-- ---------------------------------------------------------------------
alter table public.treinamentos enable row level security;
alter table public.aluno_treinamentos enable row level security;

drop policy if exists "todos logados veem" on public.treinamentos;
create policy "todos logados veem" on public.treinamentos
  for select to authenticated using (true);
drop policy if exists "time gerencia" on public.treinamentos;
create policy "time gerencia" on public.treinamentos
  for all to authenticated
  using ((select public.tem_setor('sucesso')))
  with check ((select public.tem_setor('sucesso')));

drop policy if exists "time gerencia" on public.aluno_treinamentos;
create policy "time gerencia" on public.aluno_treinamentos
  for all to authenticated
  using ((select public.tem_setor('sucesso')))
  with check ((select public.tem_setor('sucesso')));
drop policy if exists "aluno ve os seus" on public.aluno_treinamentos;
create policy "aluno ve os seus" on public.aluno_treinamentos
  for select to authenticated
  using (membro_id = (select public.meu_membro_id()));

drop policy if exists "aluno ve o proprio cadastro" on public.membros;
create policy "aluno ve o proprio cadastro" on public.membros
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 6. Capas: bucket público (só imagens; o time sobe, qualquer um vê)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('capas', 'capas', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true;

drop policy if exists "time sobe capas" on storage.objects;
create policy "time sobe capas" on storage.objects
  for all to authenticated
  using (bucket_id = 'capas' and (select public.tem_setor('sucesso')))
  with check (bucket_id = 'capas' and (select public.tem_setor('sucesso')));

notify pgrst, 'reload schema';

-- Nome do aluno e da empresa dele (sem expor o resto do cadastro do cliente)
create or replace function public.meu_cadastro_aluno()
returns table (membro_id uuid, nome text, empresa text, produto text)
language sql stable security definer
set search_path = public
as $$
  select m.id, m.nome, c.empresa, c.produto
  from public.membros m
  join public.clientes c on c.id = m.cliente_id
  where m.user_id = auth.uid()
  limit 1;
$$;
revoke all on function public.meu_cadastro_aluno() from public, anon;
grant execute on function public.meu_cadastro_aluno() to authenticated;

notify pgrst, 'reload schema';
