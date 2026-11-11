-- =====================================================================
-- Central do Cliente · ajuste de performance do banco
-- Rode UMA vez no Supabase > SQL Editor > New query > Run.
-- Não apaga nada: só cria índices e reescreve as regras de acesso
-- para o banco checar a permissão uma vez por consulta, e não linha por linha.
-- =====================================================================

-- Índices nas ligações entre tabelas (buscas por cliente, por encontro etc.)
create index if not exists membros_cliente_idx            on public.membros (cliente_id);
create index if not exists acessos_cliente_idx            on public.acessos (cliente_id);
create index if not exists arquivos_cliente_idx           on public.arquivos (cliente_id);
create index if not exists acompanhamentos_cliente_idx    on public.acompanhamentos (cliente_id, data desc);
create index if not exists presencas_membro_idx           on public.presencas (membro_id);
create index if not exists encontros_produto_data_idx     on public.encontros (produto, data);
create index if not exists clientes_status_idx            on public.clientes (status);
create index if not exists respostas_cliente_idx          on public.assessment_respostas (cliente_id);
create index if not exists respostas_membro_idx           on public.assessment_respostas (membro_id);
create index if not exists respostas_criado_idx           on public.assessment_respostas (criado_em desc);

-- Regras de acesso: "(select ...)" faz o Postgres calcular a permissão uma vez só.
do $$
declare t text;
begin
  foreach t in array array['clientes','membros','acessos','encontros','presencas','onboarding_tarefas','acompanhamentos','arquivos','assessment_perguntas','assessment_respostas']
  loop
    execute format('drop policy if exists "equipe acessa" on public.%I', t);
    execute format('create policy "equipe acessa" on public.%I for all to authenticated using ((select public.is_equipe())) with check ((select public.is_equipe()))', t);
  end loop;
end $$;

drop policy if exists "equipe ve equipe" on public.equipe;
create policy "equipe ve equipe" on public.equipe for select to authenticated
  using ((select public.is_equipe()) or user_id = (select auth.uid()));

drop policy if exists "equipe arquivos" on storage.objects;
create policy "equipe arquivos" on storage.objects
  for all to authenticated
  using (bucket_id = 'arquivos' and (select public.is_equipe()))
  with check (bucket_id = 'arquivos' and (select public.is_equipe()));

-- Atualiza as estatísticas para o banco escolher o melhor caminho
analyze;
