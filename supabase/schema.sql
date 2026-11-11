-- =====================================================================
-- Central do Cliente · Capital Upgrade
-- Cole este arquivo inteiro no Supabase > SQL Editor > New query > Run
-- Pode rodar mais de uma vez sem quebrar (usa "if not exists").
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Equipe: só quem estiver aqui consegue ver e editar os dados
-- ---------------------------------------------------------------------
create table if not exists public.equipe (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  nome      text not null,
  papel     text not null default 'time',      -- admin | time
  criado_em timestamptz not null default now()
);

create or replace function public.is_equipe()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.equipe where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------
create table if not exists public.clientes (
  id                    uuid primary key default gen_random_uuid(),
  nome                  text not null,                    -- contato principal / sócio
  empresa               text not null,
  produto               text not null check (produto in ('MGA','Ambição','Mentoria','Imersão')),
  status                text not null default 'onboarding' check (status in ('onboarding','ativo','encerrado')),
  etapa_onboarding      int  not null default 0,
  responsavel           text,
  substituto            text,
  data_inicio           date,
  encontros_contratados int  not null default 0,
  condicoes             text,
  cnpj                  text,
  segmento              text,
  cidade                text,
  site                  text,
  instagram             text,
  closer                text,
  perfil                text,
  observacoes           text,
  token                 uuid not null unique default gen_random_uuid(),  -- link do formulário de entrada
  formulario            jsonb,
  formulario_em         timestamptz,
  criado_em             timestamptz not null default now()
);

-- Time do cliente (quem participa)
create table if not exists public.membros (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references public.clientes(id) on delete cascade,
  nome            text not null,
  cargo           text,
  telefone        text,
  email           text,          -- e-mail do computador
  email_celular   text,          -- e-mail do celular
  papel           text,          -- Decisor, Financeiro, Contato do dia a dia...
  acesso_liberado boolean not null default false,
  criado_em       timestamptz not null default now()
);
create index if not exists membros_cliente_idx on public.membros(cliente_id);

-- Acessos (plataformas)
create table if not exists public.acessos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  plataforma  text not null,
  detalhe     text,
  liberado    boolean not null default false,
  criado_em   timestamptz not null default now()
);

-- Encontros (MGA, Ambição, Mentoria, Imersão)
create table if not exists public.encontros (
  id         uuid primary key default gen_random_uuid(),
  produto    text not null check (produto in ('MGA','Ambição','Mentoria','Imersão')),
  titulo     text not null,
  data       timestamptz not null,
  link       text,
  criado_em  timestamptz not null default now()
);

-- Presença (chamada)
create table if not exists public.presencas (
  encontro_id uuid not null references public.encontros(id) on delete cascade,
  membro_id   uuid not null references public.membros(id) on delete cascade,
  presente    boolean not null,
  marcado_em  timestamptz not null default now(),
  primary key (encontro_id, membro_id)
);

-- Checklist do onboarding
create table if not exists public.onboarding_tarefas (
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  chave      text not null,
  feito      boolean not null default true,
  feito_em   timestamptz not null default now(),
  primary key (cliente_id, chave)
);

-- Acompanhamentos
create table if not exists public.acompanhamentos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  data        date not null default current_date,
  motivo      text not null,
  como_foi    text,
  proposto    text,
  autor       text,
  criado_em   timestamptz not null default now()
);

-- Arquivos (contratos, gravações, documentos)
create table if not exists public.arquivos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  setor       text not null,
  nome        text not null,
  caminho     text not null,
  tamanho     bigint,
  criado_em   timestamptz not null default now()
);

-- Assessment
create table if not exists public.assessment_perguntas (
  id        uuid primary key default gen_random_uuid(),
  ordem     int  not null default 0,
  texto     text not null,
  ativa     boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.assessment_respostas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid references public.clientes(id) on delete set null,
  membro_id   uuid references public.membros(id) on delete set null,
  nome        text not null,
  contato     text,
  respostas   jsonb not null,
  criado_em   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Resumos de presença (usados no painel e na lista de encontros)
-- ---------------------------------------------------------------------
create or replace view public.presenca_cliente with (security_invoker = true) as
  select p.encontro_id, m.cliente_id, bool_or(p.presente) as presente
  from public.presencas p
  join public.membros m on m.id = p.membro_id
  group by p.encontro_id, m.cliente_id;

create or replace view public.presenca_encontro with (security_invoker = true) as
  select encontro_id,
         count(*) filter (where presente)     as presentes,
         count(*) filter (where not presente) as faltas
  from public.presencas
  group by encontro_id;

-- ---------------------------------------------------------------------
-- Segurança (RLS): só a equipe acessa
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['clientes','membros','acessos','encontros','presencas','onboarding_tarefas','acompanhamentos','arquivos','assessment_perguntas','assessment_respostas']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "equipe acessa" on public.%I', t);
    execute format('create policy "equipe acessa" on public.%I for all to authenticated using (public.is_equipe()) with check (public.is_equipe())', t);
  end loop;
end $$;

alter table public.equipe enable row level security;
drop policy if exists "equipe ve equipe" on public.equipe;
create policy "equipe ve equipe" on public.equipe for select to authenticated using (public.is_equipe() or user_id = auth.uid());

-- Página pública do assessment pode ler as perguntas ativas
drop policy if exists "publico le perguntas ativas" on public.assessment_perguntas;
create policy "publico le perguntas ativas" on public.assessment_perguntas for select to anon using (ativa);

-- ---------------------------------------------------------------------
-- Funções públicas (QR Code do assessment e formulário de entrada)
-- ---------------------------------------------------------------------
create or replace function public.responder_assessment(p_nome text, p_contato text, p_respostas jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membro  public.membros%rowtype;
  v_contato text := lower(trim(coalesce(p_contato, '')));
  v_digitos text := regexp_replace(coalesce(p_contato, ''), '\D', '', 'g');
begin
  if length(v_contato) < 5 or length(v_contato) > 200 then
    raise exception 'Contato inválido';
  end if;

  select * into v_membro
  from public.membros m
  where lower(coalesce(m.email, '')) = v_contato
     or lower(coalesce(m.email_celular, '')) = v_contato
     or (length(v_digitos) >= 8 and regexp_replace(coalesce(m.telefone, ''), '\D', '', 'g') like '%' || right(v_digitos, 8))
  order by m.criado_em
  limit 1;

  insert into public.assessment_respostas (cliente_id, membro_id, nome, contato, respostas)
  values (v_membro.cliente_id, v_membro.id,
          coalesce(nullif(trim(p_nome), ''), v_membro.nome, 'Sem nome'),
          p_contato, p_respostas);
end;
$$;

create or replace function public.formulario_cliente(p_token uuid)
returns table (nome text, empresa text, ja_respondido boolean)
language sql
stable
security definer
set search_path = public
as $$
  select c.nome, c.empresa, c.formulario is not null
  from public.clientes c
  where c.token = p_token;
$$;

create or replace function public.salvar_formulario(p_token uuid, p_dados jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.clientes
     set formulario = p_dados, formulario_em = now()
   where token = p_token;
  if not found then
    raise exception 'Link inválido';
  end if;
end;
$$;

revoke all on function public.responder_assessment(text, text, jsonb) from public;
revoke all on function public.formulario_cliente(uuid) from public;
revoke all on function public.salvar_formulario(uuid, jsonb) from public;
grant execute on function public.responder_assessment(text, text, jsonb) to anon, authenticated;
grant execute on function public.formulario_cliente(uuid) to anon, authenticated;
grant execute on function public.salvar_formulario(uuid, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Arquivos (Storage): bucket privado, só a equipe
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('arquivos', 'arquivos', false)
on conflict (id) do nothing;

drop policy if exists "equipe arquivos" on storage.objects;
create policy "equipe arquivos" on storage.objects
  for all to authenticated
  using (bucket_id = 'arquivos' and public.is_equipe())
  with check (bucket_id = 'arquivos' and public.is_equipe());
