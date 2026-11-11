-- =====================================================================
-- Central do Cliente · Cashback e gamificação
-- Rode UMA vez no Supabase > SQL Editor > New query > Run.
-- Não apaga nada: só cria a tabela de movimentos e o resumo por cliente.
-- =====================================================================

create table if not exists public.cashback_movimentos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  tipo        text not null check (tipo in ('credito', 'resgate')),
  valor       numeric(12,2) not null check (valor > 0),
  categoria   text not null default 'Outro',
  motivo      text,
  autor       text,
  criado_em   timestamptz not null default now()
);
create index if not exists cashback_cliente_idx on public.cashback_movimentos (cliente_id, criado_em desc);

alter table public.cashback_movimentos enable row level security;
drop policy if exists "equipe acessa" on public.cashback_movimentos;
create policy "equipe acessa" on public.cashback_movimentos
  for all to authenticated
  using ((select public.is_equipe()))
  with check ((select public.is_equipe()));

-- Saldo de cada cliente: ganho total, resgatado e saldo disponível
create or replace view public.cashback_saldos with (security_invoker = true) as
  select cliente_id,
         coalesce(sum(valor) filter (where tipo = 'credito'), 0)                    as total_ganho,
         coalesce(sum(valor) filter (where tipo = 'resgate'), 0)                    as total_resgatado,
         coalesce(sum(case when tipo = 'credito' then valor else -valor end), 0)   as saldo,
         count(*) filter (where tipo = 'credito')                                   as qtd_creditos,
         max(criado_em)                                                             as ultimo_movimento
  from public.cashback_movimentos
  group by cliente_id;
