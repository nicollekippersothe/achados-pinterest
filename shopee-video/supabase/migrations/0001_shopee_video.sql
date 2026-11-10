-- Fila de vídeos para Shopee Vídeos. Tabelas com prefixo sv_ no schema public.
-- RLS ligado e sem policies: só a service role (worker) acessa.

create table if not exists public.sv_videos (
  id             uuid primary key default gen_random_uuid(),
  item_id        text not null,                 -- id do produto na Shopee
  link_afiliado  text,
  legenda        text not null default '',
  origem_path    text not null,                 -- bucket sv-videos, pasta origem/
  processado_path text,                         -- bucket sv-videos, pasta processado/
  status         text not null default 'pendente'
                 check (status in ('pendente','processando','pronto','publicando','publicado','erro')),
  tentativas     int  not null default 0,
  erro           text,
  agendado_para  timestamptz not null default now(),
  publicado_em   timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create index if not exists sv_videos_fila_idx on public.sv_videos (status, agendado_para);

alter table public.sv_videos enable row level security;

-- Pega o próximo item de um status e já marca com outro, sem dois workers pegarem o mesmo.
create or replace function public.sv_claim(de text, para text)
returns setof public.sv_videos
language sql
security invoker
as $$
  update public.sv_videos v
     set status = para, atualizado_em = now()
   where v.id = (
     select id from public.sv_videos
      where status = de and agendado_para <= now()
      order by agendado_para
      for update skip locked
      limit 1
   )
  returning v.*;
$$;

revoke all on function public.sv_claim(text, text) from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('sv-videos', 'sv-videos', false, 52428800)
on conflict (id) do nothing;
