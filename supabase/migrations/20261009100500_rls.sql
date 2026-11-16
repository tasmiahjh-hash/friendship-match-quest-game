-- =============================================================================
-- Friendship Quest · 06 · Privileges and Row Level Security
--
-- Supabase grants anon/authenticated broad privileges on new public tables by
-- default and relies on RLS. We go further: revoke everything, then grant back
-- only the exact operations (and columns) each table needs, AND enable RLS.
-- Both layers must agree before a client can touch a row.
-- =============================================================================

revoke all on all tables in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS helper functions (SECURITY DEFINER, so policies don't recurse through
-- match_members' own policy). They only answer questions about the CALLER.
-- ---------------------------------------------------------------------------

create function private.is_match_member(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.match_members mm
    where mm.match_id = p_match_id
      and mm.user_id = (select auth.uid())
  );
$$;

-- Internal: is there a block in either direction? Not granted to clients
-- (it would let anyone probe arbitrary pairs).
create function private.is_blocked_pair(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.blocks bl
    where (bl.blocker_id = p_user_a and bl.blocked_id = p_user_b)
       or (bl.blocker_id = p_user_b and bl.blocked_id = p_user_a)
  );
$$;

-- Can the CALLER post in this match right now? Member + match active +
-- partner present + no block in either direction.
create function private.can_message(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.matches m
    join public.match_members me
      on me.match_id = m.id and me.user_id = (select auth.uid())
    join public.match_members other
      on other.match_id = m.id and other.user_id <> me.user_id
    where m.id = p_match_id
      and m.status = 'active'
      and not private.is_blocked_pair(me.user_id, other.user_id)
  );
$$;

revoke all on function private.is_match_member(uuid) from public;
revoke all on function private.is_blocked_pair(uuid, uuid) from public;
revoke all on function private.can_message(uuid) from public;
grant execute on function private.is_match_member(uuid) to authenticated;
grant execute on function private.can_message(uuid) to authenticated;
-- Used inside CHECK constraints, which run with the caller's privileges. Pure.
grant execute on function private.is_slug_list(text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere (default deny).
-- ---------------------------------------------------------------------------
alter table public.universities       enable row level security;
alter table public.events             enable row level security;
alter table public.profiles           enable row level security;
alter table public.profile_private    enable row level security;
alter table public.event_availability enable row level security;
alter table public.player_progress    enable row level security;
alter table public.match_requests     enable row level security;
alter table public.matches            enable row level security;
alter table public.match_members      enable row level security;
alter table public.messages           enable row level security;
alter table public.meetup_consents    enable row level security;
alter table public.meetups            enable row level security;
alter table public.contact_shares     enable row level security;
alter table public.blocks             enable row level security;
alter table public.reports            enable row level security;

-- ---------------------------------------------------------------------------
-- Catalogue: public read of active/published rows only.
-- ---------------------------------------------------------------------------
grant select on public.universities to anon, authenticated;
create policy universities_read_active on public.universities
  for select to anon, authenticated
  using (is_active);

grant select on public.events to anon, authenticated;
create policy events_read_published on public.events
  for select to anon, authenticated
  using (is_published);

-- ---------------------------------------------------------------------------
-- profiles: owner-only. No INSERT (created by the auth trigger), no DELETE
-- (account deletion cascades from auth.users). university_id, id and
-- quest_completed_at are deliberately NOT updatable by clients.
-- ---------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (first_name, avatar, program, year_of_study, courses, interests, style_answers, meet_preference)
  on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- profile_private: owner-only.
-- ---------------------------------------------------------------------------
grant select on public.profile_private to authenticated;
grant update (instagram, guidelines_version, guidelines_accepted_at) on public.profile_private to authenticated;

create policy profile_private_select_own on public.profile_private
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy profile_private_update_own on public.profile_private
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- event_availability: owner-only; may only reference published, upcoming
-- events at the owner's own university.
-- ---------------------------------------------------------------------------
grant select, delete on public.event_availability to authenticated;
grant insert (user_id, event_id) on public.event_availability to authenticated;

create policy event_availability_select_own on public.event_availability
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy event_availability_insert_own on public.event_availability
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.events e
      join public.profiles p on p.id = (select auth.uid())
      where e.id = event_id
        and e.is_published
        and e.ends_at > now()
        and e.university_id = p.university_id
    )
  );

create policy event_availability_delete_own on public.event_availability
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- player_progress: owner-only, self-reported.
-- ---------------------------------------------------------------------------
grant select on public.player_progress to authenticated;
grant insert (user_id, xp, achievements, claimed_rewards) on public.player_progress to authenticated;
grant update (xp, achievements, claimed_rewards) on public.player_progress to authenticated;

create policy player_progress_select_own on public.player_progress
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy player_progress_insert_own on public.player_progress
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy player_progress_update_own on public.player_progress
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- match_requests: read own; all writes via request_match()/cancel_match_request().
-- ---------------------------------------------------------------------------
grant select on public.match_requests to authenticated;

create policy match_requests_select_own on public.match_requests
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- matches / match_members: members only. No client INSERT/DELETE at all, so
-- matchmaking cannot be bypassed.
-- ---------------------------------------------------------------------------
grant select on public.matches to authenticated;

create policy matches_select_member on public.matches
  for select to authenticated
  using (private.is_match_member(id));

grant select on public.match_members to authenticated;
grant update (keep_chatting_here, last_read_at) on public.match_members to authenticated;

create policy match_members_select_member on public.match_members
  for select to authenticated
  using (private.is_match_member(match_id));

create policy match_members_update_own on public.match_members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- messages: members read; members post to active, unblocked matches only.
-- Insertable columns exclude sender_id, kind and created_at, so a client can
-- neither impersonate nor post "system" notices nor back-date messages.
-- Immutable: no UPDATE/DELETE grants.
-- ---------------------------------------------------------------------------
grant select on public.messages to authenticated;
grant insert (id, match_id, body) on public.messages to authenticated;

create policy messages_select_member on public.messages
  for select to authenticated
  using (private.is_match_member(match_id));

create policy messages_insert_member_active on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and kind = 'text'
    and private.can_message(match_id)
  );

-- ---------------------------------------------------------------------------
-- meetup_consents: each member sees only their OWN row. Writes via
-- set_meetup_consent() only.
-- ---------------------------------------------------------------------------
grant select on public.meetup_consents to authenticated;

create policy meetup_consents_select_own on public.meetup_consents
  for select to authenticated
  using (user_id = (select auth.uid()));

-- meetups: visible to both members once unlocked (trigger-written only).
grant select on public.meetups to authenticated;

create policy meetups_select_member on public.meetups
  for select to authenticated
  using (private.is_match_member(match_id));

-- contact_shares: visible to both members. Revoked rows carry no value.
-- Writes via share_contact()/revoke_contact() only.
grant select on public.contact_shares to authenticated;

create policy contact_shares_select_member on public.contact_shares
  for select to authenticated
  using (private.is_match_member(match_id));

-- ---------------------------------------------------------------------------
-- Safety. blocks: the blocker sees their own blocks; the blocked user does not.
-- reports: the reporter sees their own reports; the reported user never does.
-- Writes via block_match()/report_match() only.
-- ---------------------------------------------------------------------------
grant select on public.blocks to authenticated;

create policy blocks_select_own on public.blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()));

grant select on public.reports to authenticated;

create policy reports_select_own on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()));
