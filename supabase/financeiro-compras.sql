-- =====================================================================
-- Financeiro: seções (Financeiro e Faturamento) e Compras por evento
-- Rode uma vez no Supabase > SQL Editor, DEPOIS do eventos-rh.sql.
-- Pode rodar de novo sem problema.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Seções do quadro do Financeiro
--    Cada grupo de tarefas pode pertencer a uma seção (financeiro ou faturamento).
-- ---------------------------------------------------------------------
alter table public.tarefa_grupos add column if not exists secao text;

insert into public.tarefa_grupos (setor, secao, nome, cor, ordem)
select 'financeiro', g.secao, g.nome, g.cor, g.ordem
from (values
  ('financeiro',  'Pagamentos',                   'coral',  10),
  ('financeiro',  'Lançamento de notas fiscais',  'blue',   11),
  ('financeiro',  'Envio de links',               'teal',   12),
  ('faturamento', 'Comprovantes pendentes',       'amber',  20),
  ('faturamento', 'Assinatura de contrato',       'violet', 21),
  ('faturamento', 'Lançamento Omie',              'green',  22)
) as g(secao, nome, cor, ordem)
where not exists (
  select 1 from public.tarefa_grupos x where x.setor = 'financeiro' and x.nome = g.nome
);

-- ---------------------------------------------------------------------
-- 2. Compras (separadas por evento; sem evento = CAUP geral)
-- ---------------------------------------------------------------------
create table if not exists public.compras (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  descricao    text,
  quantidade   text,
  valor        numeric(12, 2),
  fornecedor   text,
  evento_id    uuid references public.eventos(id) on delete set null,
  etapa        text not null default 'orcamentos'
               check (etapa in ('orcamentos', 'reuniao', 'autorizado', 'comprando', 'finalizado')),
  responsavel  uuid references auth.users(id) on delete set null,
  prazo        date,
  ordem        int not null default 0,
  criado_por   text,
  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists compras_evento_idx on public.compras (evento_id, etapa);

create table if not exists public.compra_comentarios (
  id         uuid primary key default gen_random_uuid(),
  compra_id  uuid not null references public.compras(id) on delete cascade,
  autor_nome text,
  texto      text not null,
  criado_em  timestamptz not null default now()
);
create index if not exists compra_comentarios_idx on public.compra_comentarios (compra_id, criado_em);

alter table public.compras enable row level security;
alter table public.compra_comentarios enable row level security;

drop policy if exists "financeiro acessa" on public.compras;
create policy "financeiro acessa" on public.compras for all to authenticated
  using ((select public.tem_setor('financeiro'))) with check ((select public.tem_setor('financeiro')));
drop policy if exists "financeiro acessa" on public.compra_comentarios;
create policy "financeiro acessa" on public.compra_comentarios for all to authenticated
  using ((select public.tem_setor('financeiro'))) with check ((select public.tem_setor('financeiro')));

notify pgrst, 'reload schema';
