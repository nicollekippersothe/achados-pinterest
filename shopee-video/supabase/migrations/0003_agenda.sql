create table if not exists public.sv_agenda (
  id         uuid primary key default gen_random_uuid(),
  dia        date not null,                 -- dia no horário de Brasília
  ordem      int  not null,                 -- 1..N dentro do dia
  horario    timestamptz not null,          -- horário combinado do post
  status     text not null default 'pendente'
             check (status in ('pendente','feito','perdido')),
  video_id   uuid references public.sv_videos(id) on delete set null,
  feito_em   timestamptz,
  criado_em  timestamptz not null default now(),
  unique (dia, ordem)
);
create index if not exists sv_agenda_busca_idx on public.sv_agenda (dia, status, horario);
alter table public.sv_agenda enable row level security;
