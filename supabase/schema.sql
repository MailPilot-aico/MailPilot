-- =========================================================
--  MailPilot — Datenbank-Schema (Geräte- & Platz-Limits)
--  Ausführen in Supabase: Dashboard → SQL Editor → "Run".
-- =========================================================

-- 1) Abo-/Platz-Info je Konto.
--    Wird später vom Stripe-Webhook gepflegt; für Enterprise kann
--    seat_limit manuell auf die vereinbarte Platzzahl gesetzt werden.
create table if not exists public.subscriptions (
  account_id          text primary key,            -- Clerk org- oder user-id
  plan                text not null default 'free',-- 'free' | 'starter' | 'business' | 'enterprise'
  seat_limit          integer not null default 1,  -- max. erlaubte Geräte
  status              text not null default 'active',
  stripe_customer_id  text,
  updated_at          timestamptz not null default now()
);

-- 2) Registrierte Geräte je Konto.
create table if not exists public.devices (
  id            uuid primary key default gen_random_uuid(),
  account_id    text not null,
  device_id     text not null,                     -- vom Browser erzeugte, stabile ID
  label         text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  unique (account_id, device_id)
);

create index if not exists devices_account_idx on public.devices (account_id);

-- 3) Row Level Security AN, aber bewusst OHNE Policies für anon/authenticated.
--    Dadurch kann der öffentliche Key NICHTS lesen/schreiben – Zugriff
--    erfolgt nur serverseitig über den service_role-Key (umgeht RLS) in
--    den Netlify-Funktionen. Maximale Sicherheit.
alter table public.subscriptions enable row level security;
alter table public.devices       enable row level security;

-- 4) Persönliches Stil-Profil je Konto ("MailPilot-Gehirn").
--    Speichert Name, Signatur, Branche, Standard-Regler und den
--    GELERNTEN Schreibstil, damit MailPilot pro Nutzer nicht mehr
--    bei null anfängt. Wächst mit: aus verschickten/beispielhaften
--    E-Mails wird der Stil laufend verfeinert.
create table if not exists public.profiles (
  account_id         text primary key,                    -- Clerk org- oder user-id
  sender_name        text,                                 -- Name für Grußformel/Signatur
  signature          text,                                 -- feste Signatur (optional)
  industry           text,                                 -- Branchen-Kontext
  default_tone       text,                                 -- Standard-Tonfall (professionell|freundlich|foermlich|locker)
  default_length     integer,                              -- 0–100
  default_formality  integer,                              -- 0–100
  style_summary      text,                                 -- gelernter Schreibstil (kompakt, wird in den Prompt gesetzt)
  preferred_lang     text,                                  -- bevorzugte Übersetzungs-Zielsprache (z. B. 'en', 'pt-BR')
  samples            jsonb   not null default '[]'::jsonb, -- letzte Beispiel-/Sende-Mails (Rohtext, zum Lernen)
  learning           boolean not null default true,        -- automatisch aus Sende-Mails weiterlernen?
  updated_at         timestamptz not null default now()
);

-- RLS an, KEINE Policies für anon/authenticated: Zugriff nur serverseitig
-- über den service_role-Key in den Netlify-Funktionen (wie subscriptions/devices).
alter table public.profiles enable row level security;
