-- =====================================================================
-- Aviso de tarefa nova: som + notificação quando alguém coloca uma tarefa no seu nome
-- Rode uma vez no Supabase > SQL Editor. Pode rodar de novo sem problema.
-- =====================================================================

-- 1. Quando e por quem a tarefa foi passada para o responsável atual
alter table public.tarefas add column if not exists atribuido_em timestamptz;
alter table public.tarefas add column if not exists atribuido_por uuid;
create index if not exists tarefas_atribuido_idx on public.tarefas (responsavel, atribuido_em);

create or replace function public.marcar_atribuicao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.responsavel is not null and (tg_op = 'INSERT' or new.responsavel is distinct from old.responsavel) then
    new.atribuido_em := now();
    new.atribuido_por := auth.uid(); -- vazio quando vem do Claude ou do Gemini
  end if;
  return new;
end;
$$;

drop trigger if exists tarefas_atribuicao on public.tarefas;
create trigger tarefas_atribuicao
  before insert or update of responsavel on public.tarefas
  for each row execute function public.marcar_atribuicao();

-- 2. Até quando cada pessoa já viu as tarefas novas (começa agora: nada antigo vira "novo")
alter table public.equipe add column if not exists tarefas_vistas_em timestamptz not null default now();

create or replace function public.marcar_tarefas_vistas()
returns void
language sql
security definer
set search_path = public
as $$
  update public.equipe set tarefas_vistas_em = now() where user_id = auth.uid();
$$;
revoke all on function public.marcar_tarefas_vistas() from public;
grant execute on function public.marcar_tarefas_vistas() to authenticated;

-- 3. Quem é responsável sempre enxerga a própria tarefa, mesmo de outro setor
drop policy if exists "responsavel ve" on public.tarefas;
create policy "responsavel ve" on public.tarefas for select to authenticated
  using (responsavel = (select auth.uid()));

-- 4. Liga o tempo real da tabela de tarefas (o aviso chega com a Central aberta)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tarefas') then
    alter publication supabase_realtime add table public.tarefas;
  end if;
end;
$$;

notify pgrst, 'reload schema';
