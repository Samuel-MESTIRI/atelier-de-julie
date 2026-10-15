-- =====================================================================
-- L'Atelier de Julie — schéma de la base de données
-- Toutes les tables ont la sécurité RLS activée (voir 002_rls.sql).
-- Les heures sont stockées en "timestamptz" (UTC) et affichées
-- en Europe/Paris par l'application.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------- Types ----------------------------------------------------
do $$ begin
  create type app_role as enum ('admin', 'coiffeuse');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum ('confirme', 'annule', 'venue', 'absente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_source as enum ('en_ligne', 'telephone');
exception when duplicate_object then null; end $$;

-- ---------- Coiffeuses -----------------------------------------------
create table if not exists stylists (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null default '#9CAF88',   -- couleur dans le planning
  active     boolean not null default true,
  position   int not null default 0,            -- ordre d'affichage
  created_at timestamptz not null default now()
);

-- ---------- Comptes du back-office -----------------------------------
-- Un profil par compte de connexion Supabase (auth.users).
create table if not exists profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '',
  role       app_role not null default 'coiffeuse',
  stylist_id uuid references stylists (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- Prestations ----------------------------------------------
create table if not exists services (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text not null default '',
  duration_min int  not null check (duration_min between 5 and 720),
  price_cents  int  not null check (price_cents >= 0),
  active       boolean not null default true,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);

-- Quelle coiffeuse réalise quelle prestation
create table if not exists stylist_services (
  stylist_id uuid not null references stylists (id) on delete cascade,
  service_id uuid not null references services (id) on delete cascade,
  primary key (stylist_id, service_id)
);

-- ---------- Horaires -------------------------------------------------
-- weekday : 1 = lundi … 7 = dimanche (norme ISO)
create table if not exists salon_hours (
  weekday     smallint primary key check (weekday between 1 and 7),
  is_open     boolean not null default false,
  open_time   time,
  close_time  time,
  break_start time,          -- pause déjeuner (facultative)
  break_end   time,
  check (not is_open or (open_time is not null and close_time is not null and open_time < close_time)),
  check ((break_start is null) = (break_end is null)),
  check (break_start is null or break_start < break_end)
);

-- Horaires propres à une coiffeuse. Si aucune ligne n'existe pour un jour,
-- ce sont les horaires du salon qui s'appliquent.
create table if not exists stylist_hours (
  stylist_id  uuid not null references stylists (id) on delete cascade,
  weekday     smallint not null check (weekday between 1 and 7),
  is_working  boolean not null default true,
  start_time  time,
  end_time    time,
  break_start time,
  break_end   time,
  primary key (stylist_id, weekday),
  check (not is_working or (start_time is not null and end_time is not null and start_time < end_time)),
  check ((break_start is null) = (break_end is null)),
  check (break_start is null or break_start < break_end)
);

-- ---------- Fermetures et absences -----------------------------------
-- Fermeture de tout le salon (vacances, jour férié…), dates incluses
create table if not exists salon_closures (
  id         uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date   date not null,
  reason     text not null default '',
  check (start_date <= end_date)
);

-- Absence d'une coiffeuse (congé, rendez-vous perso…), à l'heure près
create table if not exists stylist_absences (
  id         uuid primary key default gen_random_uuid(),
  stylist_id uuid not null references stylists (id) on delete cascade,
  start_at   timestamptz not null,
  end_at     timestamptz not null,
  reason     text not null default '',
  check (start_at < end_at)
);

-- ---------- Réglages (une seule ligne) -------------------------------
create table if not exists settings (
  id                  int primary key default 1 check (id = 1),
  min_notice_hours    int not null default 2  check (min_notice_hours >= 0),
  max_advance_days    int not null default 60 check (max_advance_days between 1 and 365),
  cancel_limit_hours  int not null default 24 check (cancel_limit_hours >= 0),
  slot_step_min       int not null default 15 check (slot_step_min in (5, 10, 15, 20, 30, 60)),
  -- Informations affichées sur le site et les mentions légales
  salon_name          text not null default 'L''Atelier de Julie',
  address             text not null default '',
  phone               text not null default '',
  email               text not null default '',
  legal_name          text not null default '',
  siret               text not null default '',
  host_info           text not null default 'Netlify, Inc. — 512 2nd Street, Suite 200, San Francisco, CA 94107, États-Unis'
);

-- ---------- Clientes -------------------------------------------------
-- Une cliente est reconnue par son numéro de téléphone (normalisé).
create table if not exists clients (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  phone         text not null unique,
  email         text not null default '',
  no_show_count int  not null default 0,
  created_at    timestamptz not null default now()
);

-- ---------- Rendez-vous ----------------------------------------------
create table if not exists appointments (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients (id) on delete restrict,
  stylist_id   uuid not null references stylists (id) on delete restrict,
  service_id   uuid references services (id) on delete set null,
  service_name text not null,                 -- copie figée au moment de la réservation
  price_cents  int  not null,                 -- prix figé
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  status       appointment_status not null default 'confirme',
  source       appointment_source not null default 'en_ligne',
  cancel_token uuid not null unique default gen_random_uuid(),  -- lien d'annulation
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  cancelled_at timestamptz,
  check (starts_at < ends_at),
  -- Garde-fou : une coiffeuse ne peut pas avoir deux rendez-vous qui se chevauchent
  constraint appointments_no_overlap exclude using gist (
    stylist_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'annule')
);

create index if not exists appointments_starts_at_idx on appointments (starts_at);
create index if not exists stylist_absences_stylist_idx on stylist_absences (stylist_id, start_at);
