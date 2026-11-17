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

-- =====================================================================
-- 3. Pipelines de compras (Compras > Ambição > kanban) com colunas editáveis
--    Quem já tinha rodado este arquivo: rode de novo, ele só acrescenta.
-- =====================================================================
create table if not exists public.compra_pipelines (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  evento_id uuid references public.eventos(id) on delete set null,
  ordem     int not null default 0,
  criado_em timestamptz not null default now()
);

create table if not exists public.compra_etapas (
  id          uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.compra_pipelines(id) on delete cascade,
  nome        text not null,
  cor         text not null default 'gray',
  ordem       int not null default 0
);
create index if not exists compra_etapas_pipeline_idx on public.compra_etapas (pipeline_id, ordem);

alter table public.compras add column if not exists pipeline_id uuid references public.compra_pipelines(id) on delete cascade;
alter table public.compras add column if not exists etapa_id uuid references public.compra_etapas(id) on delete set null;
create index if not exists compras_pipeline_idx on public.compras (pipeline_id, etapa_id);

alter table public.compra_pipelines enable row level security;
alter table public.compra_etapas enable row level security;
drop policy if exists "financeiro acessa" on public.compra_pipelines;
create policy "financeiro acessa" on public.compra_pipelines for all to authenticated
  using ((select public.tem_setor('financeiro'))) with check ((select public.tem_setor('financeiro')));
drop policy if exists "financeiro acessa" on public.compra_etapas;
create policy "financeiro acessa" on public.compra_etapas for all to authenticated
  using ((select public.tem_setor('financeiro'))) with check ((select public.tem_setor('financeiro')));

-- Primeiro pipeline: CAUP geral
insert into public.compra_pipelines (nome, ordem)
select 'CAUP geral', 0 where not exists (select 1 from public.compra_pipelines);

-- Compras já ligadas a um evento ganham um pipeline com o nome do evento
insert into public.compra_pipelines (nome, evento_id, ordem)
select e.nome, e.id, 10
from public.eventos e
where exists (select 1 from public.compras c where c.evento_id = e.id and c.pipeline_id is null)
  and not exists (select 1 from public.compra_pipelines p where p.evento_id = e.id);

-- Colunas padrão para pipeline que ainda não tem nenhuma
insert into public.compra_etapas (pipeline_id, nome, cor, ordem)
select p.id, d.nome, d.cor, d.ordem
from public.compra_pipelines p
cross join (values
  ('Aguardando 3 orçamentos', 'amber', 1),
  ('Reunião', 'blue', 2),
  ('Autorizado', 'violet', 3),
  ('Comprando', 'teal', 4),
  ('Finalizado', 'green', 5)
) as d(nome, cor, ordem)
where not exists (select 1 from public.compra_etapas x where x.pipeline_id = p.id);

-- Liga as compras que já existiam ao pipeline e à coluna certa
update public.compras c
set pipeline_id = coalesce(
  (select p.id from public.compra_pipelines p where c.evento_id is not null and p.evento_id = c.evento_id order by p.criado_em limit 1),
  (select p.id from public.compra_pipelines p where p.evento_id is null order by p.ordem, p.criado_em limit 1)
)
where c.pipeline_id is null;

update public.compras c
set etapa_id = (
  select x.id from public.compra_etapas x
  where x.pipeline_id = c.pipeline_id
    and x.nome = case c.etapa when 'orcamentos' then 'Aguardando 3 orçamentos' when 'reuniao' then 'Reunião'
                              when 'autorizado' then 'Autorizado' when 'comprando' then 'Comprando' else 'Finalizado' end
  limit 1
)
where c.etapa_id is null;

notify pgrst, 'reload schema';
