-- =============================================================================
-- Friendship Quest · 03 · Player data
-- Identity always references auth.users. The authentication email is NEVER
-- copied into these tables; it stays in auth.users and is only read server-side
-- when its owner explicitly shares it (see public.share_contact).
-- =============================================================================

-- Non-sensitive quest answers. Owner-only under RLS; match partners see a
-- reduced projection through public.get_match_partner().
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Derived from the verified email domain by a trigger. Clients cannot write it.
  university_id text not null references public.universities (id) on delete restrict,
  first_name text
    constraint profiles_first_name_length check (first_name is null or char_length(btrim(first_name)) between 1 and 30),
  avatar text not null default '🦊'
    constraint profiles_avatar_length check (char_length(avatar) between 1 and 16),
  program text
    constraint profiles_program_length check (program is null or char_length(btrim(program)) between 1 and 80),
  year_of_study public.year_of_study,
  courses text[] not null default '{}'
    constraint profiles_courses_limit check (
      cardinality(courses) <= 8
      and array_position(courses, null) is null
      and char_length(array_to_string(courses, ',')) <= 200
    ),
  interests text[] not null default '{}'
    constraint profiles_interests_valid check (cardinality(interests) <= 8 and private.is_slug_list(interests)),
  style_answers jsonb not null default '{}'::jsonb
    constraint profiles_style_answers_object check (jsonb_typeof(style_answers) = 'object'),
  meet_preference public.meet_preference,
  quest_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Backstop for public.complete_quest(): a completed quest must be complete.
  constraint profiles_completed_quest_is_complete check (
    quest_completed_at is null
    or (
      first_name is not null
      and program is not null
      and year_of_study is not null
      and meet_preference is not null
      and cardinality(interests) between 4 and 8
    )
  )
);

comment on table public.profiles is 'Quest answers. Owner-only; never contains email or social handles.';

create index profiles_matchable_idx on public.profiles (university_id) where quest_completed_at is not null;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

-- Private contact details and consent records. Owner-only, never joined into
-- any query that another user can run.
create table public.profile_private (
  user_id uuid primary key references auth.users (id) on delete cascade,
  instagram text
    constraint profile_private_instagram_format check (instagram is null or instagram ~ '^@[A-Za-z0-9._]{1,30}$'),
  guidelines_version text
    constraint profile_private_guidelines_version_length check (guidelines_version is null or char_length(guidelines_version) between 1 and 20),
  guidelines_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_private_guidelines_pair check ((guidelines_version is null) = (guidelines_accepted_at is null))
);

comment on table public.profile_private is 'Owner-only private data (Instagram, guideline consent). Shared only via share_contact().';

create trigger profile_private_touch_updated_at
  before update on public.profile_private
  for each row execute function private.touch_updated_at();

-- Which events a student could attend. Owner-only; matchmaking reads it
-- server-side and stores just the overlap on the match.
create table public.event_availability (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index event_availability_event_idx on public.event_availability (event_id);

-- Gamification state. Owner-only and self-reported (low stakes by design).
create table public.player_progress (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  xp integer not null default 0
    constraint player_progress_xp_range check (xp between 0 and 1000000),
  achievements text[] not null default '{}'
    constraint player_progress_achievements_valid check (cardinality(achievements) <= 64 and private.is_slug_list(achievements)),
  claimed_rewards text[] not null default '{}'
    constraint player_progress_rewards_limit check (cardinality(claimed_rewards) <= 128),
  updated_at timestamptz not null default now()
);

create trigger player_progress_touch_updated_at
  before update on public.player_progress
  for each row execute function private.touch_updated_at();
