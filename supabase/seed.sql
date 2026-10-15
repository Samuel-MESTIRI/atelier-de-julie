-- =====================================================================
-- Données de test — à NE PAS lancer sur la base de production réelle
-- une fois le salon en service (efface les rendez-vous existants).
-- Lancement : npm run db:seed
-- =====================================================================

-- Date du jour à Paris (la base, elle, est en UTC)
create or replace function pg_temp.paris_today() returns date language sql as $$
  select (now() at time zone 'Europe/Paris')::date;
$$;

truncate appointments, clients, stylist_absences, salon_closures,
         stylist_hours, stylist_services, salon_hours, services, settings cascade;
delete from profiles;
delete from stylists;

-- ---------- Réglages -------------------------------------------------
insert into settings (id, min_notice_hours, max_advance_days, cancel_limit_hours, slot_step_min,
                      salon_name, address, phone, email, legal_name, siret)
values (1, 2, 60, 24, 15,
        'L''Atelier de Julie',
        '12 rue de Paris, 78100 Saint-Germain-en-Laye',
        '01 23 45 67 89',
        'contact@atelier-julie.test',
        'Julie Exemple (entreprise individuelle)',
        '000 000 000 00000');

-- ---------- Coiffeuses (identifiants fixes pour lier les comptes) ----
insert into stylists (id, name, color, position) values
  ('11111111-1111-1111-1111-111111111111', 'Julie', '#7D9471', 1),
  ('22222222-2222-2222-2222-222222222222', 'Sarah', '#C49A6C', 2),
  ('33333333-3333-3333-3333-333333333333', 'Inès',  '#9C8AA5', 3);

-- ---------- Prestations ----------------------------------------------
insert into services (id, name, description, duration_min, price_cents, position) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Coupe femme', 'Shampoing, coupe et coiffage',          45, 3500, 1),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Coupe homme', 'Shampoing et coupe',                    30, 2200, 2),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Couleur',     'Coloration complète, shampoing soin',   90, 6500, 3),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'Brushing',    'Shampoing et brushing',                 30, 2500, 4);

-- Toutes les coiffeuses font toutes les prestations
insert into stylist_services (stylist_id, service_id)
select s.id, sv.id from stylists s cross join services sv;

-- ---------- Horaires du salon : mardi → samedi, 9 h – 19 h -----------
-- Pause déjeuner d'exemple 12 h 30 – 13 h 30 (modifiable dans le back-office)
insert into salon_hours (weekday, is_open, open_time, close_time, break_start, break_end) values
  (1, false, null,    null,    null,    null),
  (2, true,  '09:00', '19:00', '12:30', '13:30'),
  (3, true,  '09:00', '19:00', '12:30', '13:30'),
  (4, true,  '09:00', '19:00', '12:30', '13:30'),
  (5, true,  '09:00', '19:00', '12:30', '13:30'),
  (6, true,  '09:00', '19:00', '12:30', '13:30'),
  (7, false, null,    null,    null,    null);

-- Exemple d'horaire propre : Inès ne travaille pas le mercredi
insert into stylist_hours (stylist_id, weekday, is_working) values
  ('33333333-3333-3333-3333-333333333333', 3, false);

-- ---------- Fermetures : 3 semaines en août --------------------------
insert into salon_closures (start_date, end_date, reason) values
  ('2026-08-03', '2026-08-23', 'Congés d''été'),
  ('2027-08-02', '2027-08-22', 'Congés d''été');

-- ---------- Absence d'exemple : Sarah absente le 2e samedi à venir ----
insert into stylist_absences (stylist_id, start_at, end_at, reason)
select '22222222-2222-2222-2222-222222222222',
       (d + time '09:00') at time zone 'Europe/Paris',
       (d + time '19:00') at time zone 'Europe/Paris',
       'Congé'
from (select d::date as d
      from generate_series(pg_temp.paris_today() + 1, pg_temp.paris_today() + 21, interval '1 day') d
      where extract(isodow from d) = 6
      order by d offset 1 limit 1) x;

-- ---------- Clientes et rendez-vous d'exemple ------------------------
insert into clients (id, full_name, phone, email, no_show_count) values
  ('cccccccc-0000-0000-0000-000000000001', 'Camille Martin',  '0611111111', 'camille@example.com', 0),
  ('cccccccc-0000-0000-0000-000000000002', 'Léa Bernard',     '0622222222', 'lea@example.com',     1),
  ('cccccccc-0000-0000-0000-000000000003', 'Thomas Petit',    '0633333333', 'thomas@example.com',  0),
  ('cccccccc-0000-0000-0000-000000000004', 'Manon Durand',    '0644444444', 'manon@example.com',   0);

-- Quelques rendez-vous sur les 3 prochains jours d'ouverture
with days as (
  select d::date as d, row_number() over (order by d) as n
  from generate_series(pg_temp.paris_today() + 1, pg_temp.paris_today() + 14, interval '1 day') d
  where extract(isodow from d) between 2 and 6
  limit 3
)
insert into appointments (client_id, stylist_id, service_id, service_name, price_cents, starts_at, ends_at, source)
select v.client_id::uuid, v.stylist_id::uuid, v.service_id::uuid, sv.name, sv.price_cents,
       (days.d + v.t::time) at time zone 'Europe/Paris',
       (days.d + v.t::time) at time zone 'Europe/Paris' + make_interval(mins => sv.duration_min),
       v.src::appointment_source
from (values
  (1, 'cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', '09:30', 'en_ligne'),
  (1, 'cccccccc-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000003', '10:00', 'telephone'),
  (1, 'cccccccc-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000002', '14:00', 'en_ligne'),
  (2, 'cccccccc-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000004', '11:00', 'en_ligne'),
  (3, 'cccccccc-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000004', '16:00', 'en_ligne')
) as v(n, client_id, stylist_id, service_id, t, src)
join days on days.n = v.n
join services sv on sv.id = v.service_id::uuid;

-- Historique : un rendez-vous passé de Léa, marqué « absente » (cohérent avec no_show_count = 1)
insert into appointments (client_id, stylist_id, service_id, service_name, price_cents, starts_at, ends_at, status)
select 'cccccccc-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', id, name, price_cents,
       ((pg_temp.paris_today() - 14) + time '15:00') at time zone 'Europe/Paris',
       ((pg_temp.paris_today() - 14) + time '15:00') at time zone 'Europe/Paris' + make_interval(mins => duration_min),
       'absente'
from services where id = 'aaaaaaaa-0000-0000-0000-000000000001';
