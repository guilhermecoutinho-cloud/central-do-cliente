-- =====================================================================
-- RH: posição de cada pessoa no organograma livre (arrastar e soltar)
-- Rode uma vez no Supabase > SQL Editor, depois do eventos-rh.sql.
-- Pode rodar de novo sem problema.
-- =====================================================================
alter table public.rh_pessoas add column if not exists pos_x int;
alter table public.rh_pessoas add column if not exists pos_y int;

notify pgrst, 'reload schema';
