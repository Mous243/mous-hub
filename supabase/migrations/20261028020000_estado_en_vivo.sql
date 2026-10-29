-- Mous Hub: estado en vivo de los proyectos, historial de chequeos, avisos de cobro y página pública de estado.
-- IMPORTANTE: el valor __SECRETO__ se reemplaza al generar el SQL a aplicar (no se guarda en el repositorio).

-- 1) Estado en vivo en cada proyecto (+ interruptor para publicar su página de estado)
alter table proyectos
  add column if not exists en_linea boolean,
  add column if not exists latencia_ms int,
  add column if not exists http_estado int,
  add column if not exists chequeado_en timestamptz,
  add column if not exists estado_publico boolean not null default false;

-- 2) Historial de chequeos (para el % de disponibilidad)
create table if not exists chequeos (
  id bigint generated always as identity primary key,
  proyecto_id bigint not null references proyectos(id) on delete cascade,
  ok boolean not null,
  http_estado int,
  latencia_ms int,
  creado_en timestamptz not null default now()
);
create index if not exists chequeos_proyecto_fecha on chequeos (proyecto_id, creado_en desc);
alter table chequeos enable row level security;
drop policy if exists "solo el dueño" on chequeos;
create policy "solo el dueño" on chequeos for all to authenticated
  using ((auth.jwt() ->> 'email') = '__EMAIL__')
  with check ((auth.jwt() ->> 'email') = '__EMAIL__');

-- 3) Secreto de las tareas automáticas. RLS activado y SIN políticas: nadie puede leerlo desde la API; solo las funciones de abajo.
create table if not exists hub_secretos (nombre text primary key, valor text not null);
alter table hub_secretos enable row level security;
insert into hub_secretos (nombre, valor) values ('cron', '__SECRETO__')
  on conflict (nombre) do update set valor = excluded.valor;

create or replace function hub_ok(p_secreto text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from hub_secretos where nombre = 'cron' and valor = p_secreto)
$$;
revoke all on function hub_ok(text) from public, anon, authenticated;

-- 4) Funciones para el servidor (Vercel Cron): solo responden si llega el secreto correcto.
create or replace function hub_urls(p_secreto text)
returns table (id bigint, nombre text, slug text, url_vivo text, en_linea boolean)
language plpgsql security definer set search_path = public as $$
begin
  if not hub_ok(p_secreto) then raise exception 'no autorizado'; end if;
  return query select p.id, p.nombre, p.slug, p.url_vivo, p.en_linea
    from proyectos p where p.url_vivo is not null and p.estado in ('activo', 'desarrollo');
end $$;

create or replace function hub_guardar_estado(p_secreto text, p_datos jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare d jsonb;
begin
  if not hub_ok(p_secreto) then raise exception 'no autorizado'; end if;
  for d in select * from jsonb_array_elements(p_datos) loop
    update proyectos set en_linea = (d ->> 'ok')::boolean, latencia_ms = nullif(d ->> 'ms', '')::int,
           http_estado = nullif(d ->> 'http', '')::int, chequeado_en = now()
     where id = (d ->> 'id')::bigint;
    insert into chequeos (proyecto_id, ok, http_estado, latencia_ms)
      values ((d ->> 'id')::bigint, (d ->> 'ok')::boolean, nullif(d ->> 'http', '')::int, nullif(d ->> 'ms', '')::int);
  end loop;
  delete from chequeos where creado_en < now() - interval '120 days';
end $$;

create or replace function hub_cobros(p_secreto text)
returns table (id bigint, nombre text, contacto text, telefono text, mensualidad numeric, vencimiento date, dias_gracia int, servicio text, estado text)
language plpgsql security definer set search_path = public as $$
begin
  if not hub_ok(p_secreto) then raise exception 'no autorizado'; end if;
  return query select c.id, c.nombre, c.contacto, c.telefono, c.mensualidad, c.vencimiento, c.dias_gracia, c.servicio, c.estado
    from clientes_agencia c where c.vencimiento is not null;
end $$;

grant execute on function hub_urls(text), hub_guardar_estado(text, jsonb), hub_cobros(text) to anon, authenticated;

-- 5) Página pública de estado (/estado/<slug>): solo proyectos con estado_publico = true; devuelve lo mínimo.
create or replace function estado_publico(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((
    select jsonb_build_object(
      'nombre', p.nombre,
      'en_linea', p.en_linea,
      'chequeado_en', p.chequeado_en,
      'uptime_30d', (select round(100.0 * count(*) filter (where c.ok) / nullif(count(*), 0), 2)
                       from chequeos c where c.proyecto_id = p.id and c.creado_en > now() - interval '30 days'),
      'dias', coalesce((select jsonb_agg(jsonb_build_object('d', x.d, 'ok', x.ok) order by x.d)
                from (select (c.creado_en at time zone 'America/Caracas')::date as d, bool_and(c.ok) as ok
                        from chequeos c where c.proyecto_id = p.id and c.creado_en > now() - interval '30 days' group by 1) x), '[]'::jsonb)
    ) from proyectos p where p.slug = lower(trim(p_slug)) and p.estado_publico = true and p.url_vivo is not null
  ), jsonb_build_object('no_encontrado', true))
$$;
grant execute on function estado_publico(text) to anon, authenticated;
