-- =====================================================================
-- Área do aluno, parte 2: Ferramentas, Próximos encontros, NPS e Conexões
-- Rode uma vez no Supabase > SQL Editor (depois do area-aluno.sql).
-- Pode rodar de novo sem problema.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Ferramentas: links e materiais que o time libera para os alunos
-- ---------------------------------------------------------------------
create table if not exists public.aluno_ferramentas (
  id        uuid primary key default gen_random_uuid(),
  titulo    text not null,
  descricao text,
  url       text not null,
  produto   text,                       -- vazio = todos os alunos; senão só quem é daquele produto
  ordem     int not null default 0,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- NPS: de 0 a 10, quanto o aluno recomendaria a Capital Upgrade
-- ---------------------------------------------------------------------
create table if not exists public.nps_respostas (
  id         uuid primary key default gen_random_uuid(),
  membro_id  uuid not null references public.membros(id) on delete cascade,
  nota       int  not null check (nota between 0 and 10),
  comentario text,
  criado_em  timestamptz not null default now()
);
create index if not exists nps_respostas_membro_idx on public.nps_respostas (membro_id, criado_em desc);

-- ---------------------------------------------------------------------
-- Conexões: fornecedores, clientes e parceiros estratégicos entre os alunos
-- ---------------------------------------------------------------------
create table if not exists public.conexoes (
  id         uuid primary key default gen_random_uuid(),
  membro_id  uuid references public.membros(id) on delete cascade,  -- aluno dono do cadastro (vazio = cadastrado pelo time)
  tipo       text not null check (tipo in ('fornecedor', 'cliente', 'parceiro')),
  nome       text not null,
  empresa    text,
  segmento   text,
  descricao  text,
  whatsapp   text,
  email      text,
  site       text,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);
create unique index if not exists conexoes_um_por_aluno on public.conexoes (membro_id) where membro_id is not null;
create index if not exists conexoes_tipo_idx on public.conexoes (tipo) where ativo;

-- ---------------------------------------------------------------------
-- Próximos encontros do produto do aluno (o link só aparece para quem tem acesso liberado)
-- ---------------------------------------------------------------------
create or replace function public.meus_proximos_encontros()
returns table (id uuid, produto text, titulo text, data timestamptz, link text)
language sql stable security definer
set search_path = public
as $$
  select e.id, e.produto, e.titulo, e.data, case when m.acesso_liberado then e.link end
  from public.membros m
  join public.clientes c on c.id = m.cliente_id
  join public.encontros e on e.produto = c.produto
  where m.user_id = auth.uid() and e.data > now() - interval '3 hours'
  order by e.data
  limit 12;
$$;
revoke all on function public.meus_proximos_encontros() from public, anon;
grant execute on function public.meus_proximos_encontros() to authenticated;

-- ---------------------------------------------------------------------
-- Regras de acesso
-- ---------------------------------------------------------------------
alter table public.aluno_ferramentas enable row level security;
alter table public.nps_respostas enable row level security;
alter table public.conexoes enable row level security;

-- Ferramentas: o time gerencia; o aluno vê as ativas
drop policy if exists "time gerencia" on public.aluno_ferramentas;
create policy "time gerencia" on public.aluno_ferramentas for all to authenticated
  using ((select public.tem_setor('sucesso'))) with check ((select public.tem_setor('sucesso')));
drop policy if exists "aluno ve ativas" on public.aluno_ferramentas;
create policy "aluno ve ativas" on public.aluno_ferramentas for select to authenticated
  using (ativo and (select public.meu_membro_id()) is not null);

-- NPS: o aluno responde e vê as próprias respostas; o time vê todas
drop policy if exists "time gerencia" on public.nps_respostas;
create policy "time gerencia" on public.nps_respostas for all to authenticated
  using ((select public.tem_setor('sucesso'))) with check ((select public.tem_setor('sucesso')));
drop policy if exists "aluno ve as suas" on public.nps_respostas;
create policy "aluno ve as suas" on public.nps_respostas for select to authenticated
  using (membro_id = (select public.meu_membro_id()));
drop policy if exists "aluno responde" on public.nps_respostas;
create policy "aluno responde" on public.nps_respostas for insert to authenticated
  with check (membro_id = (select public.meu_membro_id()));

-- Conexões: alunos e time veem as ativas; o aluno cuida do próprio cadastro; o time gerencia tudo
drop policy if exists "time gerencia" on public.conexoes;
create policy "time gerencia" on public.conexoes for all to authenticated
  using ((select public.tem_setor('sucesso'))) with check ((select public.tem_setor('sucesso')));
drop policy if exists "aluno ve ativas" on public.conexoes;
create policy "aluno ve ativas" on public.conexoes for select to authenticated
  using ((ativo and (select public.meu_membro_id()) is not null) or membro_id = (select public.meu_membro_id()));
drop policy if exists "aluno cria o seu" on public.conexoes;
create policy "aluno cria o seu" on public.conexoes for insert to authenticated
  with check (membro_id = (select public.meu_membro_id()));
drop policy if exists "aluno muda o seu" on public.conexoes;
create policy "aluno muda o seu" on public.conexoes for update to authenticated
  using (membro_id = (select public.meu_membro_id())) with check (membro_id = (select public.meu_membro_id()));
drop policy if exists "aluno apaga o seu" on public.conexoes;
create policy "aluno apaga o seu" on public.conexoes for delete to authenticated
  using (membro_id = (select public.meu_membro_id()));

notify pgrst, 'reload schema';
