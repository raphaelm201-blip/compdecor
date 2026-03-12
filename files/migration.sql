-- =====================================================
-- MIGRATION: Visualizador de Quadros Ambientados
-- Cole no SQL Editor do Supabase e execute.
-- =====================================================

-- ── Artistas ──────────────────────────────────────
create table if not exists artistas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  email       text unique not null,
  bio         text,
  website     text,
  logo_url    text,
  criado_em   timestamptz default now()
);

-- ── Obras ─────────────────────────────────────────
create table if not exists obras (
  id             uuid primary key default gen_random_uuid(),
  artista_id     uuid not null references artistas(id) on delete cascade,
  titulo         text not null,
  descricao      text,
  tecnica        text not null,
  largura        numeric(8,2) not null,  -- em cm
  altura         numeric(8,2) not null,  -- em cm
  ano            int,
  preco          numeric(12,2) not null,
  disponivel     boolean default true,
  imagem_url     text not null,
  imagens_extra  text[] default '{}',
  criado_em      timestamptz default now(),
  atualizado_em  timestamptz default now()
);

-- Auto-atualiza atualizado_em
create or replace function set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

create trigger obras_atualizado_em
  before update on obras
  for each row execute function set_atualizado_em();

-- ── Cenas ─────────────────────────────────────────
create table if not exists cenas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  categoria   text not null,  -- 'sala' | 'quarto' | 'escritorio' | 'cafe'
  imagem_url  text not null,
  parede_x    numeric(5,2) not null,  -- % horizontal do centro da parede (0-100)
  parede_y    numeric(5,2) not null,  -- % vertical do centro da parede (0-100)
  parede_w    numeric(8,2) not null,  -- largura máx em px da imagem original
  parede_h    numeric(8,2) not null,  -- altura máx em px da imagem original
  ativa       boolean default true,
  criado_em   timestamptz default now()
);

-- ── Orçamentos ────────────────────────────────────
create type status_orcamento as enum ('ENVIADO', 'VISUALIZADO', 'FECHADO', 'CANCELADO');

create table if not exists orcamentos (
  id                  uuid primary key default gen_random_uuid(),
  artista_id          uuid not null references artistas(id),
  cliente_nome        text not null,
  cliente_email       text not null,
  cliente_telefone    text,
  observacoes         text,
  status              status_orcamento default 'ENVIADO',
  pdf_url             text,
  criado_em           timestamptz default now(),
  visualizado_em      timestamptz
);

-- ── Itens do Orçamento ────────────────────────────
create table if not exists itens_orcamento (
  id              uuid primary key default gen_random_uuid(),
  orcamento_id    uuid not null references orcamentos(id) on delete cascade,
  obra_id         uuid not null references obras(id),
  mockup_url      text,
  cena_usada      text,
  quantidade      int not null default 1,
  preco_unitario  numeric(12,2) not null
);

-- ── Row Level Security ────────────────────────────
-- Obras e Cenas: leitura pública
alter table obras enable row level security;
create policy "obras_leitura_publica" on obras
  for select using (disponivel = true);

alter table cenas enable row level security;
create policy "cenas_leitura_publica" on cenas
  for select using (ativa = true);

alter table artistas enable row level security;
create policy "artistas_leitura_publica" on artistas
  for select using (true);

-- Orçamentos: qualquer um pode inserir (cliente), ninguém lê via frontend
alter table orcamentos enable row level security;
create policy "orcamentos_insert_publico" on orcamentos
  for insert with check (true);

alter table itens_orcamento enable row level security;
create policy "itens_insert_publico" on itens_orcamento
  for insert with check (true);

-- ── Dados iniciais: cenas de exemplo ─────────────
-- Substitua imagem_url pelas imagens reais no Supabase Storage
insert into cenas (nome, categoria, imagem_url, parede_x, parede_y, parede_w, parede_h) values
  ('Sala Moderna',        'sala',       'https://SEU_PROJETO.supabase.co/storage/v1/object/public/cenas/sala-moderna.jpg',      50, 38, 900, 700),
  ('Sala Rústica',        'sala',       'https://SEU_PROJETO.supabase.co/storage/v1/object/public/cenas/sala-rustica.jpg',      48, 40, 850, 650),
  ('Quarto Minimalista',  'quarto',     'https://SEU_PROJETO.supabase.co/storage/v1/object/public/cenas/quarto-minimalista.jpg',52, 35, 800, 600),
  ('Escritório Clean',    'escritorio', 'https://SEU_PROJETO.supabase.co/storage/v1/object/public/cenas/escritorio-clean.jpg',  50, 40, 750, 580),
  ('Café Aconchegante',   'cafe',       'https://SEU_PROJETO.supabase.co/storage/v1/object/public/cenas/cafe.jpg',              50, 42, 700, 550)
on conflict do nothing;

-- ── Storage: criar buckets ────────────────────────
-- Execute no SQL Editor do Supabase:
insert into storage.buckets (id, name, public) values
  ('cenas',      'cenas',      true),
  ('obras',      'obras',      true),
  ('mockups',    'mockups',    true),
  ('orcamentos', 'orcamentos', true)
on conflict do nothing;

-- Políticas de storage: leitura pública, upload autenticado
create policy "storage_cenas_publico"   on storage.objects for select using (bucket_id = 'cenas');
create policy "storage_obras_publico"   on storage.objects for select using (bucket_id = 'obras');
create policy "storage_mockups_publico" on storage.objects for select using (bucket_id = 'mockups');
create policy "storage_orcamentos_publico" on storage.objects for select using (bucket_id = 'orcamentos');

create policy "storage_mockups_insert"    on storage.objects for insert with check (bucket_id = 'mockups');
create policy "storage_orcamentos_insert" on storage.objects for insert with check (bucket_id = 'orcamentos');
