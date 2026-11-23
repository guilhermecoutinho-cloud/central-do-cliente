-- =====================================================================
-- Google Agenda: cada pessoa conecta a conta do Google e as tarefas dela viram
-- eventos na agenda, no dia do prazo (criar, mudar e apagar acompanham a Central).
-- Rode uma vez no Supabase > SQL Editor. Pode rodar de novo sem problema.
-- =====================================================================

-- pg_net: deixa o banco avisar a Central (na Vercel) quando uma tarefa muda
create extension if not exists pg_net;

-- 1. Conta do Google de cada pessoa (os códigos de acesso ficam só no servidor: sem leitura pelo navegador)
create table if not exists public.google_contas (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  email         text,
  refresh_token text not null,
  access_token  text,
  expira_em     timestamptz,
  agenda        text not null default 'primary',
  conectado_em  timestamptz not null default now(),
  ultimo_erro   text
);
alter table public.google_contas enable row level security;
-- Sem políticas: ninguém lê pelo navegador. A Central lê com a chave de serviço.

-- A pessoa consegue ver só se ela está conectada (sem os códigos)
create or replace function public.minha_conta_google()
returns table (email text, conectado_em timestamptz, ultimo_erro text)
language sql
stable
security definer
set search_path = public
as $$
  select g.email, g.conectado_em, g.ultimo_erro from public.google_contas g where g.user_id = auth.uid();
$$;
revoke all on function public.minha_conta_google() from public;
grant execute on function public.minha_conta_google() to authenticated;

-- 2. Cada tarefa lembra qual evento ela criou e na agenda de quem
alter table public.tarefas add column if not exists google_evento_id text;
alter table public.tarefas add column if not exists google_user uuid;

-- 3. Endereço da Central e um segredo para o banco provar que é ele avisando
create table if not exists public.google_config (
  id      int primary key default 1 check (id = 1),
  url_app text not null,
  segredo text not null
);
alter table public.google_config enable row level security;
insert into public.google_config (id, url_app, segredo)
values (1, 'https://central-do-cliente-ten.vercel.app', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
on conflict (id) do update set url_app = excluded.url_app;  -- o segredo continua o mesmo

-- 4. Toda vez que uma tarefa é criada, muda (nome, prazo, responsável, status) ou é apagada, avisa a Central
create or replace function public.tarefa_para_google()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.google_config;
begin
  select * into cfg from public.google_config where id = 1;
  if cfg is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    if old.google_evento_id is not null then
      perform net.http_post(
        url := cfg.url_app || '/api/google/sync',
        body := jsonb_build_object('segredo', cfg.segredo, 'acao', 'apagar', 'evento', old.google_evento_id, 'usuario', old.google_user),
        headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 10000
      );
    end if;
    return old;
  end if;

  -- Só chama se a tarefa já tem evento ou se o dono dela conectou o Google (evita chamadas à toa)
  if new.google_evento_id is null
     and not exists (select 1 from public.google_contas g where g.user_id = coalesce(new.responsavel, new.criado_por)) then
    return new;
  end if;

  perform net.http_post(
    url := cfg.url_app || '/api/google/sync',
    body := jsonb_build_object('segredo', cfg.segredo, 'acao', 'sincronizar', 'tarefa', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
  return new;
end;
$$;

drop trigger if exists tarefas_google on public.tarefas;
create trigger tarefas_google
  after insert or delete or update of titulo, descricao, prazo, responsavel, status, setor on public.tarefas
  for each row execute function public.tarefa_para_google();

notify pgrst, 'reload schema';
