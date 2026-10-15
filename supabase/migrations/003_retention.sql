-- =====================================================================
-- RGPD : suppression automatique des données anciennes
-- Comme annoncé dans la politique de confidentialité, une cliente et son
-- historique sont supprimés 3 ans après son dernier rendez-vous.
-- =====================================================================

create or replace function purge_old_clients()
returns int language plpgsql security definer set search_path = public as $$
declare
  removed int;
begin
  with old as (
    select c.id from clients c
    where not exists (
      select 1 from appointments a
      where a.client_id = c.id and a.ends_at > now() - interval '3 years'
    )
    and c.created_at < now() - interval '3 years'
  ), del_appointments as (
    delete from appointments where client_id in (select id from old)
  )
  delete from clients where id in (select id from old);
  get diagnostics removed = row_count;
  return removed;
end $$;

-- Personne d'autre que le serveur ne peut lancer la purge
revoke execute on function purge_old_clients() from public, anon, authenticated;

-- Lancement automatique chaque nuit à 3 h (UTC) grâce à pg_cron, si disponible
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule('purge-old-clients')
    where exists (select 1 from cron.job where jobname = 'purge-old-clients');
  perform cron.schedule('purge-old-clients', '0 3 * * *', 'select public.purge_old_clients()');
exception when others then
  raise notice 'pg_cron indisponible : lancer "select purge_old_clients();" manuellement de temps en temps.';
end $$;
