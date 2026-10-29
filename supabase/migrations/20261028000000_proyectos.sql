-- Mous Hub: inventario de todos los proyectos (propios y de clientes), activos, pausados, archivados y en zip.
create table if not exists proyectos (
  id bigint generated always as identity primary key,
  slug text not null unique,
  nombre text not null,
  tipo text not null default 'web'
    check (tipo in ('web','app','escritorio','bot','landing','catalogo','trading','herramienta')),
  estado text not null default 'activo'
    check (estado in ('activo','desarrollo','pausado','archivado','idea')),
  origen text not null default 'propio' check (origen in ('propio','cliente')),
  cliente text,
  descripcion text,
  funciones text[] not null default '{}',
  stack text[] not null default '{}',
  carpeta text,                       -- ruta local relativa al Escritorio
  url_vivo text,
  zip text,                           -- ruta del comprimido si existe
  version text,
  ultima_actividad date,
  respaldo text not null default 'ninguno' check (respaldo in ('git','zip','ambos','ninguno')),
  marca text not null default 'pendiente' check (marca in ('pendiente','aplicada','no_aplica')),
  pendientes text,
  notas text,
  enlaces jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function proyectos_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists proyectos_touch on proyectos;
create trigger proyectos_touch before update on proyectos for each row execute function proyectos_touch();

alter table proyectos enable row level security;
drop policy if exists "acceso anon (protegido por PIN en la app)" on proyectos;
create policy "acceso anon (protegido por PIN en la app)" on proyectos
  for all using (true) with check (true);
