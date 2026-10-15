-- =====================================================================
-- Règles d'accès (RLS)
--  - visiteuse (anon)     : lit uniquement les prestations, coiffeuses
--                           actives et réglages publics. Elle ne lit
--                           JAMAIS les rendez-vous ni les clientes :
--                           la réservation passe par le serveur.
--  - coiffeuse            : voit son propre planning
--  - admin (Julie)        : tout
-- =====================================================================

-- ---------- Fonctions utilitaires ------------------------------------
-- "security definer" : elles lisent profiles sans déclencher les règles RLS
-- (évite une boucle infinie de vérification).
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function my_stylist_id()
returns uuid language sql stable security definer set search_path = public as $$
  select stylist_id from profiles where id = auth.uid();
$$;

-- ---------- Activation RLS partout -----------------------------------
alter table stylists          enable row level security;
alter table profiles          enable row level security;
alter table services          enable row level security;
alter table stylist_services  enable row level security;
alter table salon_hours       enable row level security;
alter table stylist_hours     enable row level security;
alter table salon_closures    enable row level security;
alter table stylist_absences  enable row level security;
alter table settings          enable row level security;
alter table clients           enable row level security;
alter table appointments      enable row level security;

-- On repart de zéro pour pouvoir rejouer ce fichier sans erreur
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on %I', r.policyname, r.tablename);
  end loop;
end $$;

-- ---------- Admin : accès complet à toutes les tables ----------------
create policy admin_all on stylists         for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on profiles         for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on services         for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on stylist_services for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on salon_hours      for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on stylist_hours    for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on salon_closures   for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on stylist_absences for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on settings         for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on clients          for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on appointments     for all to authenticated using (is_admin()) with check (is_admin());

-- ---------- Lecture publique (site vitrine et réservation) ----------
create policy public_read on services         for select to anon, authenticated using (active);
create policy public_read on stylists         for select to anon, authenticated using (active);
create policy public_read on stylist_services for select to anon, authenticated using (true);
create policy public_read on settings         for select to anon, authenticated using (true);
create policy public_read on salon_hours      for select to anon, authenticated using (true);  -- affichées sur le site

-- ---------- Coiffeuse : son profil et son planning -------------------
create policy own_profile on profiles
  for select to authenticated using (id = auth.uid());

create policy own_appointments on appointments
  for select to authenticated using (stylist_id = my_stylist_id());

create policy own_clients on clients
  for select to authenticated using (
    exists (select 1 from appointments a
            where a.client_id = clients.id and a.stylist_id = my_stylist_id())
  );

create policy own_absences on stylist_absences
  for select to authenticated using (stylist_id = my_stylist_id());

-- Le personnel voit les horaires et fermetures (affichage du planning)
create policy staff_read on stylist_hours  for select to authenticated using (true);
create policy staff_read on salon_closures for select to authenticated using (true);
