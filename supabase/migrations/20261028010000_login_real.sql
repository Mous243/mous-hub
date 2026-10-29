-- Mous Hub: acceso real. Solo el correo del dueño (sesión de Supabase Auth) puede leer o escribir estas tablas.
-- Ejecutar DESPUÉS de crear el usuario en Authentication → Users y de comprobar que el login funciona.
-- (estado_servicio() es security definer: los sitios de los clientes siguen funcionando con la clave anon.)
do $$
declare t text;
begin
  foreach t in array array['clientes_agencia','pagos_suscripcion','proyectos'] loop
    execute format('drop policy if exists "acceso anon (protegido por PIN en la app)" on %I', t);
    execute format('drop policy if exists "solo el dueño" on %I', t);
    execute format('create policy "solo el dueño" on %I for all to authenticated using ((auth.jwt() ->> ''email'') = ''__EMAIL__'') with check ((auth.jwt() ->> ''email'') = ''__EMAIL__'')', t);
  end loop;
end $$;
