-- =============================================================================
-- Friendship Quest · 02 · Catalogue
-- Universities and supervised friendship events. Non-personal, readable by
-- everyone (the questionnaire shows them before sign-up); writable only by
-- admins via the dashboard / service role.
-- =============================================================================

create table public.universities (
  id text primary key
    constraint universities_id_format check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null
    constraint universities_name_length check (char_length(name) between 2 and 120),
  short_name text not null
    constraint universities_short_name_length check (char_length(short_name) between 1 and 12),
  emoji text not null default '🎓'
    constraint universities_emoji_length check (char_length(emoji) between 1 and 16),
  -- Lowercase registrable domain, e.g. 'ualberta.ca'. Subdomains (mail.ualberta.ca) also match.
  email_domain text not null unique
    constraint universities_email_domain_format
      check (email_domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  is_active boolean not null default true,
  -- Fictional rows used for demos/dev. Must never be active in production.
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.universities is 'Campuses Friendship Quest runs at. email_domain gates sign-up.';

create table public.events (
  id uuid primary key default gen_random_uuid(),
  university_id text not null references public.universities (id) on delete restrict,
  -- Stable human id that matches the client catalogue (e.g. 'halloween-social').
  slug text not null
    constraint events_slug_format check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null
    constraint events_name_length check (char_length(name) between 2 and 80),
  emoji text not null default '🎉'
    constraint events_emoji_length check (char_length(emoji) between 1 and 16),
  description text not null default ''
    constraint events_description_length check (char_length(description) <= 500),
  location text not null
    constraint events_location_length check (char_length(location) between 2 and 120),
  host text not null default 'FAC team'
    constraint events_host_length check (char_length(host) between 2 and 60),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  gradient text[] not null default array['#ff8a6b', '#a78bfa']
    constraint events_gradient_pair check (cardinality(gradient) = 2),
  capacity integer
    constraint events_capacity_positive check (capacity is null or capacity > 0),
  is_published boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_order check (ends_at > starts_at),
  constraint events_slug_per_university unique (university_id, slug)
);

comment on table public.events is 'Supervised FAC friendship events. Only published rows are visible to clients.';

create index events_university_start_idx on public.events (university_id, starts_at) where is_published;

create trigger events_touch_updated_at
  before update on public.events
  for each row execute function private.touch_updated_at();
