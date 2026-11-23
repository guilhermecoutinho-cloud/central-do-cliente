-- =====================================================================
-- Horário nas tarefas (início e fim). Com horário, o evento entra na Google Agenda
-- das X às Y; sem horário, continua sendo de dia inteiro no dia do prazo.
-- Rode no Supabase > SQL Editor (depois do google-agenda.sql). Pode rodar de novo.
-- =====================================================================
alter table public.tarefas add column if not exists hora_inicio time;
alter table public.tarefas add column if not exists hora_fim time;

-- A agenda também acompanha quando o horário muda
do $$
begin
  if exists (select 1 from pg_proc where proname = 'tarefa_para_google') then
    drop trigger if exists tarefas_google on public.tarefas;
    create trigger tarefas_google
      after insert or delete or update of titulo, descricao, prazo, hora_inicio, hora_fim, responsavel, status, setor on public.tarefas
      for each row execute function public.tarefa_para_google();
  end if;
end $$;

notify pgrst, 'reload schema';
