-- =============================================================================
-- Friendship Quest · 04 · Matching and the Match Room
-- Rows in matches / match_members / meetups / contact_shares are only ever
-- created by SECURITY DEFINER functions or triggers, never by client inserts.
-- =============================================================================

-- The waiting pool.
create table public.match_requests (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  university_id text not null references public.universities (id) on delete restrict,
  status public.match_request_status not null default 'waiting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index match_requests_waiting_idx on public.match_requests (university_id, created_at) where status = 'waiting';

create trigger match_requests_touch_updated_at
  before update on public.match_requests
  for each row execute function private.touch_updated_at();

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  university_id text not null references public.universities (id) on delete restrict,
  -- '<lower uuid>:<higher uuid>'. Unique: a pair is never matched twice
  -- (in particular, not after an unmatch or a block).
  pair_key text not null
    constraint matches_pair_key_unique unique,
  compatibility smallint not null
    constraint matches_compatibility_range check (compatibility between 0 and 100),
  -- Overlap computed at match time, so neither member ever needs to read the
  -- other's raw interests or availability.
  shared_interests text[] not null default '{}',
  shared_event_ids uuid[] not null default '{}',
  shared_style jsonb not null default '{}'::jsonb
    constraint matches_shared_style_object check (jsonb_typeof(shared_style) = 'object'),
  status public.match_status not null default 'active',
  ended_by uuid references auth.users (id) on delete set null,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint matches_end_consistency check ((status = 'active') = (ended_at is null))
);

create index matches_university_idx on public.matches (university_id);

create table public.match_members (
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- The member's own "Keep chatting here" choice.
  keep_chatting_here boolean not null default false,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create index match_members_user_idx on public.match_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  -- Defaults to the caller; clients are not granted the column, so they cannot
  -- choose a sender. Null for system notices (and after account deletion).
  sender_id uuid default auth.uid() references auth.users (id) on delete set null,
  kind public.message_kind not null default 'text',
  body text not null
    constraint messages_body_length check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  constraint messages_system_has_no_sender check (kind = 'text' or sender_id is null)
);

create index messages_match_created_idx on public.messages (match_id, created_at);
create index messages_sender_idx on public.messages (sender_id);

-- One row per member. Readable only by that member, so a one-sided "yes" is
-- never revealed to the other person.
create table public.meetup_consents (
  match_id uuid not null,
  user_id uuid not null,
  event_id uuid not null references public.events (id) on delete cascade,
  status public.consent_status not null default 'interested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (match_id, user_id),
  foreign key (match_id, user_id) references public.match_members (match_id, user_id) on delete cascade
);

create index meetup_consents_event_idx on public.meetup_consents (event_id);

create trigger meetup_consents_touch_updated_at
  before update on public.meetup_consents
  for each row execute function private.touch_updated_at();

-- Created by a trigger only when BOTH members consent to the same event.
create table public.meetups (
  match_id uuid primary key references public.matches (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  status public.meetup_status not null default 'unlocked',
  unlocked_at timestamptz not null default now(),
  cancelled_at timestamptz,
  constraint meetups_cancel_consistency check ((status = 'cancelled') = (cancelled_at is not null))
);

create index meetups_event_idx on public.meetups (event_id);

-- Written only by share_contact()/revoke_contact(), which use auth.uid() as the
-- owner and copy the value server-side. Revoking erases the value.
create table public.contact_shares (
  match_id uuid not null,
  owner_id uuid not null,
  channel public.contact_channel not null,
  value text
    constraint contact_shares_value_length check (value is null or char_length(value) between 2 and 320),
  shared_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (match_id, owner_id, channel),
  foreign key (match_id, owner_id) references public.match_members (match_id, user_id) on delete cascade,
  constraint contact_shares_revoked_has_no_value check ((revoked_at is null) = (value is not null))
);

create index contact_shares_owner_idx on public.contact_shares (owner_id);
