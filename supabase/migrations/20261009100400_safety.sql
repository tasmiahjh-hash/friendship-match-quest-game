-- =============================================================================
-- Friendship Quest · 05 · Safety
-- =============================================================================

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid references public.matches (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

-- Readable by the reporter only. The reported student never sees reports
-- through the client role. Moderator access is a later phase and will go
-- through an audited function, never a broad SELECT policy.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches (id) on delete set null,
  reporter_id uuid references auth.users (id) on delete set null,
  reported_id uuid references auth.users (id) on delete set null,
  reason public.report_reason not null,
  details text not null default ''
    constraint reports_details_length check (char_length(details) <= 600),
  also_blocked boolean not null default false,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_not_self check (reporter_id is distinct from reported_id or reporter_id is null)
);

create index reports_reporter_idx on public.reports (reporter_id);
create index reports_reported_idx on public.reports (reported_id);
create index reports_match_idx on public.reports (match_id);
create index reports_queue_idx on public.reports (status, created_at);

create trigger reports_touch_updated_at
  before update on public.reports
  for each row execute function private.touch_updated_at();
