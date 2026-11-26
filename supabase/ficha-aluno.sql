-- =====================================================================
-- Ficha do aluno: foto, evento de origem, consultor, faixa de faturamento,
-- quem indicou e as indicações de cada aluno (ligadas ao cashback).
-- Rode no Supabase > SQL Editor. Pode rodar de novo sem problema.
-- =====================================================================

-- 1. Campos novos no cadastro
alter table public.clientes add column if not exists foto_url          text;
alter table public.clientes add column if not exists evento_origem     text;   -- evento em que ele veio (ex.: GC, Máquina de Vendas)
alter table public.clientes add column if not exists consultor         text;   -- consultor que atende / vendeu
alter table public.clientes add column if not exists faixa_faturamento text;
alter table public.clientes add column if not exists indicado_por_id   uuid references public.clientes(id) on delete set null;
alter table public.clientes add column if not exists indicado_por_nome text;   -- quando quem indicou não é aluno
create index if not exists clientes_indicado_por_idx on public.clientes (indicado_por_id) where indicado_por_id is not null;

-- 2. Indicações que cada aluno fez
create table if not exists public.indicacoes (
  id               uuid primary key default gen_random_uuid(),
  indicador_id     uuid not null references public.clientes(id) on delete cascade,  -- o aluno que indicou
  nome             text not null,
  empresa          text,
  telefone         text,
  email            text,
  produto          text,
  status           text not null default 'Indicado' check (status in ('Indicado', 'Em negociação', 'Fechou', 'Não fechou')),
  valor_venda      numeric(12, 2),
  cliente_id       uuid references public.clientes(id) on delete set null,          -- quando a indicação virou aluno
  cashback_mov_id  uuid references public.cashback_movimentos(id) on delete set null,
  observacoes      text,
  criado_por       text,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);
create index if not exists indicacoes_indicador_idx on public.indicacoes (indicador_id, criado_em desc);

alter table public.indicacoes enable row level security;
drop policy if exists "sucesso acessa" on public.indicacoes;
create policy "sucesso acessa" on public.indicacoes for all to authenticated
  using ((select public.tem_setor('sucesso'))) with check ((select public.tem_setor('sucesso')));

notify pgrst, 'reload schema';
