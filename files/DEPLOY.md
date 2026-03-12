# 🚀 Guia de Deploy — Supabase + Vercel

> Stack: React + TypeScript · @react-pdf/renderer · Supabase (DB + Storage) · Vercel (host + serverless)

---

## Visão Geral da Arquitetura

```
Browser (React)
  ├── Canvas API          → composição do mockup (100% client-side)
  ├── @react-pdf/renderer → geração do PDF (100% client-side)
  └── Supabase JS SDK     → lê obras/cenas, salva orçamentos e faz upload

Vercel
  ├── /                   → app React (Vite build)
  └── /api/enviar-orcamento → Serverless Function (Node.js) → SMTP

Supabase
  ├── Database (Postgres) → artistas, obras, cenas, orcamentos
  └── Storage             → bucket "mockups" + bucket "orcamentos" (PDFs)
```

---

## 1. Configurar o Supabase

### 1.1 Criar projeto

1. Acesse [supabase.com](https://supabase.com) → **New project**
2. Escolha nome (ex: `quadros-app`), senha forte, região `South America (São Paulo)`
3. Aguarde ~2 min o provisionamento

### 1.2 Rodar a migration

1. No painel Supabase → **SQL Editor** → **New query**
2. Cole o conteúdo de `supabase/migration.sql` e clique em **Run**
3. Você verá as tabelas criadas em **Table Editor**

### 1.3 Criar os Storage Buckets

No painel → **Storage** → **New bucket**:

| Bucket      | Public? | Descrição                          |
|-------------|---------|-------------------------------------|
| `mockups`   | ✅ Sim  | Imagens compostas (obra + cena)     |
| `orcamentos`| ✅ Sim  | PDFs dos orçamentos gerados         |

> Buckets públicos permitem que o e-mail envie links diretos ao cliente.

### 1.4 Configurar Storage Policies (RLS)

No Supabase → Storage → cada bucket → **Policies** → adicione:

```sql
-- Permite INSERT e SELECT público (anon) nos dois buckets
-- Execute no SQL Editor para cada bucket:

-- Para bucket "mockups":
create policy "public upload mockups"
  on storage.objects for insert
  to anon with check (bucket_id = 'mockups');

create policy "public read mockups"
  on storage.objects for select
  to anon using (bucket_id = 'mockups');

-- Para bucket "orcamentos":
create policy "public upload orcamentos"
  on storage.objects for insert
  to anon with check (bucket_id = 'orcamentos');

create policy "public read orcamentos"
  on storage.objects for select
  to anon using (bucket_id = 'orcamentos');
```

### 1.5 Configurar RLS nas tabelas

```sql
-- Permite leitura pública de obras e cenas
alter table obras enable row level security;
create policy "obras leitura publica" on obras for select to anon using (true);

alter table cenas enable row level security;
create policy "cenas leitura publica" on cenas for select to anon using (true);

-- Permite inserção de orçamentos pelo cliente (anon)
alter table orcamentos enable row level security;
create policy "criar orcamento" on orcamentos for insert to anon with check (true);

alter table itens_orcamento enable row level security;
create policy "criar itens" on itens_orcamento for insert to anon with check (true);
```

### 1.6 Pegar as credenciais

No painel → **Project Settings** → **API**:

- `Project URL` → será `VITE_SUPABASE_URL`
- `anon public` key → será `VITE_SUPABASE_ANON_KEY`
- `service_role` key → será `SUPABASE_SERVICE_KEY` (só no servidor, nunca no front!)

### 1.7 Inserir dados iniciais (seed)

No **SQL Editor**, insira um artista e algumas cenas de exemplo:

```sql
-- Artista de exemplo
insert into artistas (nome, email, website) values
  ('Galeria Arte Viva', 'contato@arteviva.com.br', 'https://arteviva.com.br');

-- Cenas (substitua imagem_url por URLs reais dos seus fundos)
-- Dica: faça upload das imagens de cena no bucket "mockups" primeiro
insert into cenas (nome, categoria, imagem_url, parede_x, parede_y, parede_w, parede_h) values
  ('Sala Moderna', 'sala', 'https://SEU_PROJETO.supabase.co/storage/v1/object/public/mockups/cenas/sala-moderna.jpg', 55, 38, 600, 400),
  ('Quarto Minimalista', 'quarto', 'https://SEU_PROJETO.supabase.co/storage/v1/object/public/mockups/cenas/quarto-minimalista.jpg', 50, 35, 500, 380),
  ('Escritório', 'escritorio', 'https://SEU_PROJETO.supabase.co/storage/v1/object/public/mockups/cenas/escritorio.jpg', 45, 40, 450, 350);
```

---

## 2. Configurar o Vercel

### 2.1 Subir o código no GitHub

```bash
# Na raiz do projeto (pasta frontend/)
git init
git add .
git commit -m "feat: visualizador de quadros v1"
git remote add origin https://github.com/SEU_USUARIO/quadros-app.git
git push -u origin main
```

### 2.2 Criar projeto no Vercel

1. Acesse [vercel.com](https://vercel.com) → **Add New Project**
2. Importe o repositório do GitHub
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` ← importante!
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 2.3 Adicionar variáveis de ambiente no Vercel

Em **Settings** → **Environment Variables**, adicione:

| Variável                   | Valor                                  | Ambiente     |
|----------------------------|----------------------------------------|--------------|
| `VITE_SUPABASE_URL`        | `https://xxxx.supabase.co`             | All          |
| `VITE_SUPABASE_ANON_KEY`   | `eyJh...` (anon key)                   | All          |
| `SUPABASE_SERVICE_KEY`     | `eyJh...` (service_role key)           | All          |
| `SMTP_HOST`                | `smtp.gmail.com`                       | All          |
| `SMTP_PORT`                | `587`                                  | All          |
| `SMTP_USER`                | `seuemail@gmail.com`                   | All          |
| `SMTP_PASS`                | Senha de app do Gmail                  | All          |

> ⚠️ `VITE_*` ficam expostos no bundle — use apenas a `anon key`.
> `SUPABASE_SERVICE_KEY` e credenciais SMTP ficam apenas nas Serverless Functions.

### 2.4 Deploy

Clique em **Deploy**. O Vercel vai:
1. Instalar dependências (`npm install`)
2. Fazer o build Vite (`npm run build`)
3. Publicar o `dist/` como site estático
4. Detectar `api/enviar-orcamento.js` como Serverless Function automaticamente

---

## 3. Configurar Gmail para envio de e-mail

1. Acesse [myaccount.google.com/security](https://myaccount.google.com/security)
2. Ative **Verificação em duas etapas**
3. Em **Senhas de app** → crie uma senha para "Mail"
4. Use essa senha de 16 dígitos como `SMTP_PASS`

---

## 4. Fluxo completo em produção

```
Cliente abre o app (Vercel)
  │
  ├─ Carrega obras e cenas (Supabase DB via anon key)
  │
  ├─ Seleciona obra + cena
  │   └─ Canvas API compõe mockup no browser
  │       └─ Upload do mockup → Supabase Storage (bucket: mockups)
  │
  ├─ Clica "Solicitar Orçamento"
  │   ├─ @react-pdf/renderer gera PDF no browser
  │   ├─ Upload do PDF → Supabase Storage (bucket: orcamentos)
  │   ├─ Salva orçamento + itens → Supabase DB
  │   └─ POST /api/enviar-orcamento (Vercel Serverless)
  │       └─ Nodemailer envia e-mail com link do PDF para cliente e galeria
  │
  └─ Tela de sucesso ✅
```

---

## 5. Verificar se está funcionando

```bash
# Health check da Serverless Function
curl https://SEU-APP.vercel.app/api/enviar-orcamento -X POST \
  -H "Content-Type: application/json" \
  -d '{"orcamentoId":"test","clienteEmail":"teste@teste.com","clienteNome":"Teste","artistaNome":"Galeria"}'
```

---

## 6. Domínio customizado (opcional)

No Vercel → **Settings** → **Domains** → adicione `visualizador.arteviva.com.br`

No DNS do seu domínio, adicione um registro CNAME apontando para `cname.vercel-dns.com`.

---

## Custos estimados (planos gratuitos)

| Serviço  | Plano Free inclui                                  |
|----------|----------------------------------------------------|
| Supabase | 500MB DB · 1GB Storage · 2GB bandwidth             |
| Vercel   | 100GB bandwidth · Serverless Functions ilimitadas  |
| Gmail    | Até ~500 e-mails/dia via SMTP                      |

> Para volumes maiores: Supabase Pro (~$25/mês) + Resend ou SendGrid para e-mail.
