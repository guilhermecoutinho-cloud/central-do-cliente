-- Dados para matrícula do cliente (colados na tela Novo cliente).
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem problema.

alter table public.clientes add column if not exists data_nascimento date;
alter table public.clientes add column if not exists cpf             text;
alter table public.clientes add column if not exists rg              text;
alter table public.clientes add column if not exists email           text;
alter table public.clientes add column if not exists celular         text;
alter table public.clientes add column if not exists endereco        text;
alter table public.clientes add column if not exists bairro          text;
alter table public.clientes add column if not exists estado          text;
alter table public.clientes add column if not exists cep             text;

-- Atualiza o cache da API para as colunas novas aparecerem na hora
notify pgrst, 'reload schema';
