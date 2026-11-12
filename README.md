# Central da Empresa · Capital Upgrade

Plataforma interna do time, organizada por setor (Sucesso do Cliente, Marketing, Vendas, Eventos e Financeiro), com acesso limitado por usuário e um quadro de tarefas estilo Monday em cada setor.

No setor **Sucesso do Cliente** fica a antiga Central do Cliente: onboarding com checklist, time do cliente, encontros com chamada, dossiê (cadastro, contatos, acessos, formulários, arquivos), acompanhamentos, assessment por QR Code e cashback.

Feita com **Next.js** (site) + **Supabase** (banco de dados, login e arquivos), para rodar na **Vercel**.

---

## Passo a passo para colocar no ar

### 1. Supabase (banco de dados)

1. Entre em https://supabase.com e crie um projeto (**New project**). Região sugerida: **South America (São Paulo)**. Guarde a senha do banco.
2. No menu da esquerda, abra **SQL Editor** → **New query**.
3. Abra o arquivo `supabase/schema.sql` deste projeto, copie tudo, cole no editor e clique em **Run**. Tem que aparecer "Success". Depois faça o mesmo com o arquivo `supabase/central-empresa.sql` (setores, acessos e tarefas).
4. Vá em **Authentication** → **Sign In / Providers** (ou **Providers**) e **desligue** a opção que permite novos cadastros ("Allow new users to sign up"). Assim só entra quem você criar.
5. Crie o seu usuário: **Authentication** → **Users** → **Add user** → **Create new user**. Coloque e-mail e senha e marque **Auto Confirm User**.
6. Libere esse usuário na equipe: volte ao **SQL Editor** e rode (trocando o e-mail e o nome):

   ```sql
   insert into public.equipe (user_id, nome, papel)
   select id, 'Guilherme', 'admin' from auth.users where email = 'seu-email@capitalupgrade.com.br';
   ```

   Faça o mesmo para cada pessoa do time: crie o usuário no passo 5 e rode o comando acima com o e-mail dela, trocando `'admin'` por `'time'`. Quem é `admin` vê todos os setores e libera o acesso dos outros na tela **Início** da central (grade "Acesso por usuário").
7. Pegue as chaves: **Project Settings** → **API** (ou **Data API** / **API Keys**). Copie:
   - **Project URL** (ex.: `https://abcd1234.supabase.co`)
   - **anon public key** (em projetos novos pode aparecer como **publishable key**)

### 2. GitHub (guardar o código)

1. Descompacte o `.zip`.
2. Em https://github.com/new crie um repositório **privado** (ex.: `central-do-cliente`).
3. Na página do repositório vazio, clique em **uploading an existing file** e arraste **o conteúdo** da pasta `central-do-cliente` (as pastas `app`, `components`, `lib`, `public`, `supabase` e os arquivos `package.json`, `next.config.mjs` etc.). Clique em **Commit changes**.
   - O arquivo `.gitignore` começa com ponto e pode ficar oculto no seu computador. Ele não é obrigatório para funcionar.

### 3. Vercel (colocar o site no ar)

1. Entre em https://vercel.com com a sua conta do GitHub.
2. **Add New** → **Project** → escolha o repositório `central-do-cliente` → **Import**.
3. Em **Environment Variables**, adicione as duas:
   - `NEXT_PUBLIC_SUPABASE_URL` = a Project URL do Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = a anon/publishable key do Supabase
4. Clique em **Deploy**. Em 1 a 2 minutos o site fica no ar num endereço `https://central-do-cliente-xxxx.vercel.app`.
5. Volte ao Supabase → **Authentication** → **URL Configuration** e coloque esse endereço em **Site URL**.

### 4. Endereço próprio (opcional)

Na Vercel: **Project** → **Settings** → **Domains** → adicione, por exemplo, `central.seudominio.com.br`. A Vercel mostra o registro DNS (CNAME) que precisa ser criado onde o domínio está registrado. Depois atualize a **Site URL** no Supabase com o novo endereço.

---

## Setores e tarefas (estilo Monday)

- Quem já tinha o banco criado: rode **uma vez** o arquivo `supabase/central-empresa.sql` no SQL Editor. Ele cria os setores, o acesso por usuário e as tarefas, e dá acesso ao Sucesso do Cliente para quem já estava na equipe (ninguém perde acesso). Pode rodar de novo sem problema.
- **Início:** resumo das suas tarefas, os setores (com e sem acesso) e, para o administrador, a grade de acesso por usuário.
- **Quadro do setor** (`/setor/marketing`, `/setor/vendas` etc.): grupos coloridos, tarefas com responsável, status, prazo e prioridade trocados direto na linha, e as visões **Tabela**, **Kanban** (arrastar entre colunas muda o status) e **Calendário**. Filtro por pessoa e busca.
- **Tarefa aberta:** nome e descrição editáveis, subtarefas, mural de atualizações e registro de atividade.
- **Minhas tarefas:** tudo que está com você, de todos os setores, separado por prazo.
- O acesso é garantido no banco: quem não tem o setor liberado não consegue ler nem gravar as tarefas dele, mesmo tentando por fora do site.
- Status, prioridades e cores ficam em `lib/tarefas.js`. Os setores ficam em `lib/setores.js`.

## Performance

- `vercel.json` coloca o servidor do site em **São Paulo (gru1)**, perto do banco. O projeto do Supabase também precisa estar em **South America (São Paulo)**; se estiver em outra região, troque `gru1` pela região mais próxima dele.
- Quem já tinha o banco criado antes de 11/11/2026: rode **uma vez** o arquivo `supabase/performance.sql` no SQL Editor (cria índices e deixa as regras de acesso mais leves). Quem for criar do zero, o `schema.sql` já inclui isso.

## Conectar ao Claude (criar tarefas pelo chat)

Com o conector, você manda as tarefas no chat do Claude e elas aparecem nos quadros da Central. Dá também para pedir ao Claude para importar uma planilha de tarefas.

1. Na Vercel → **Settings** → **Environment Variables**, adicione e depois faça **Redeploy**:
   - `CLAUDE_CONECTOR_CHAVE` = uma senha longa e aleatória (pelo menos 24 caracteres)
   - `SUPABASE_SERVICE_ROLE_KEY` = a chave **service_role / secret** do Supabase (Project Settings → API Keys). Ela só fica no servidor.
   - Opcional: `CLAUDE_CONECTOR_NOME` = nome que aparece no registro de atividade (padrão: Claude)
2. Entre na Central como administrador e abra **Conectar ao Claude** no menu. Copie o endereço.
3. No Claude: **Configurações → Conectores → Adicionar conector personalizado**, cole o endereço. Em planos Team/Enterprise, quem adiciona é o dono da organização.
4. No chat: "cria no marketing: criativos do podcast para sexta, P0, comigo".

O endereço funciona como senha. Para trocar, mude a `CLAUDE_CONECTOR_CHAVE` na Vercel.

## Criar tarefas com IA (Gemini)

1. Em https://aistudio.google.com, entre com a conta Google da empresa → **Get API key** → **Create API key**.
2. Na Vercel, adicione `GEMINI_API_KEY` com essa chave (Production) e faça **Redeploy**.
3. No quadro de cada setor aparece o botão **Criar com IA**: cole uma lista, ata ou mensagem, revise e crie.

Opcional: `GEMINI_MODELO` para trocar o modelo (padrão `gemini-3.5-flash-lite`).

## Cashback e gamificação

- Quem já tinha o banco criado: rode **uma vez** o arquivo `supabase/cashback.sql` no SQL Editor. Quem for criar do zero, o `schema.sql` já inclui.
- Na ficha do cliente, aba **Cashback**: dar cashback (indicação, renovação, presença, depoimento, desafio ou outro), registrar resgate, ver nível e conquistas.
- No menu, **Cashback**: ranking dos clientes, total em aberto, distribuído e resgatado.
- Valores sugeridos, níveis (Bronze, Prata, Ouro, Diamante) e conquistas ficam em `lib/cashback.js`.

## Primeiros passos dentro da central

1. **Encontros** → cadastre o calendário de cada produto (MGA, Ambição, Mentoria, Imersão). É com essas datas que a central calcula o saldo de encontros de cada cliente.
2. **Assessment** → cadastre as perguntas. O QR Code aponta para `/responder`; quem responde informa o e-mail ou telefone do cadastro e a resposta entra no nome dele.
3. **+ Novo cliente** → cadastre o cliente. Ele cai direto no onboarding, na etapa Entrada.
4. No cliente, aba **Time**: cadastre quem vai participar (nome, cargo, telefone e os dois e-mails).
5. No cliente, aba **Dossiê → Formulários**: copie o link do formulário de entrada e mande para o cliente. A resposta aparece ali sozinha.

## Como funciona o saldo de encontros

- Todo encontro do produto que já aconteceu, a partir da **data de início** do cliente, conta como usado (mesmo se ele faltar).
- **Saldo = contratados − usados.**
- Renovação antecipada: na aba **Encontros** ou na **Visão geral**, use "Registrar renovação" e informe quantos encontros entram. Eles somam no total (ex.: tinha 1 sobrando e renovou 3 → fica com 4).

## Onde mudar as coisas

| O que | Arquivo |
|---|---|
| Etapas, tarefas e mensagens prontas do onboarding | `lib/onboarding.js` |
| Regras "pode / não pode" | `lib/onboarding.js` (final do arquivo) |
| Perguntas do formulário de entrada | `lib/formulario.js` |
| Produtos, perfis de cliente e setores dos arquivos | `lib/util.js` |
| Cores e visual | `app/globals.css` |
| Logo | `public/logo-caup.png` |

Ao mudar e enviar para o GitHub, a Vercel publica a nova versão sozinha.

## Segurança e LGPD

- Só usuários cadastrados na tabela `equipe` veem os dados (regras de segurança do próprio banco).
- As únicas páginas abertas sem login são `/responder` (assessment) e `/formulario/...` (formulário de entrada de cada cliente, com um link único).
- Os arquivos ficam num bucket privado; os links de download expiram em 1 hora.
- No plano gratuito do Supabase o limite por arquivo é de 50 MB. Gravações longas: salve no Drive e anexe o link num acompanhamento, ou suba o plano.

## Próxima versão (ideias já combinadas)

- Presença automática pelo Zoom.
- Mensagens pelo WhatsApp (Unnica).
- Contrato vindo do CRM.
- Cruzamento da base de mentorados (fornecedores x cliente ideal).
- Visão que o próprio cliente acessa.
- Aba de Eventos (separada dos clientes).

## Rodar no computador (opcional, para quem for programar)

```bash
npm install
cp .env.example .env.local   # e preencha as duas chaves
npm run dev                  # abre em http://localhost:3000
```
