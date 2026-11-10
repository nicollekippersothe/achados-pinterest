alter table public.sv_videos
  add column if not exists produto_nome text,
  add column if not exists url_produto text,
  add column if not exists preco numeric,
  add column if not exists comissao_pct numeric;

create index if not exists sv_videos_item_idx on public.sv_videos (item_id);

create table if not exists public.sv_descartados (
  item_id    text primary key,
  motivo     text,
  criado_em  timestamptz not null default now()
);
alter table public.sv_descartados enable row level security;
