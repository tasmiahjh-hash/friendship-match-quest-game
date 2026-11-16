-- =============================================================================
-- Friendship Quest · 07 · Server functions (RPCs) and triggers
--
-- Every cross-user action goes through a SECURITY DEFINER function that:
--   * pins search_path = '' and fully qualifies every object,
--   * derives the acting user from auth.uid() (never from an argument),
--   * checks membership / state explicitly,
--   * is executable by `authenticated` only (revoked from public and anon).
-- Error codes: 42501 = not allowed, P0001 = invalid request/state.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Internal helpers (not granted to clients)
-- ---------------------------------------------------------------------------

create function private.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

-- Raises unless the caller belongs to the match. Returns the match row.
create function private.require_member(p_match_id uuid)
returns public.matches
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
begin
  select m.* into v_match
  from public.matches m
  join public.match_members mm on mm.match_id = m.id
  where m.id = p_match_id
    and mm.user_id = private.require_user();

  if v_match.id is null then
    raise exception 'Not a member of this match' using errcode = '42501';
  end if;
  return v_match;
end;
$$;

-- The other member of a match, from the caller's point of view.
create function private.partner_of(p_match_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select mm.user_id
  from public.match_members mm
  where mm.match_id = p_match_id
    and mm.user_id <> (select auth.uid())
  limit 1;
$$;

-- SQL port of scoreCandidate() in src/services/matchService.ts.
-- Weights: interests 45%, friendship style 30%, shared events 15%, meet preference 10%.
create function private.compatibility(p_a uuid, p_b uuid)
returns table (score smallint, shared_interests text[], shared_event_ids uuid[], shared_style jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  a public.profiles;
  b public.profiles;
  v_interests text[];
  v_events uuid[];
  v_style jsonb := '{}'::jsonb;
  v_style_points numeric := 0;
  v_key text;
  v_mine text;
  v_theirs text;
  v_interest_ratio numeric;
  v_event_ratio numeric;
  v_pref_ratio numeric;
  v_raw numeric;
begin
  select * into a from public.profiles where id = p_a;
  select * into b from public.profiles where id = p_b;
  if a.id is null or b.id is null then
    return;
  end if;

  select coalesce(array_agg(x order by x), '{}')
    into v_interests
  from (select unnest(a.interests) intersect select unnest(b.interests)) as s (x);

  select coalesce(array_agg(ea.event_id order by e.starts_at), '{}')
    into v_events
  from public.event_availability ea
  join public.event_availability eb on eb.event_id = ea.event_id and eb.user_id = p_b
  join public.events e on e.id = ea.event_id
  where ea.user_id = p_a
    and e.is_published
    and e.ends_at > now();

  for v_key, v_mine in select key, value from jsonb_each_text(a.style_answers) loop
    v_theirs := b.style_answers ->> v_key;
    continue when v_theirs is null;
    if v_mine = v_theirs then
      v_style_points := v_style_points + 1;
      v_style := v_style || jsonb_build_object(v_key, v_mine);
    elsif (v_mine, v_theirs) in (
      ('quiet', 'mix'), ('mix', 'quiet'), ('mix', 'social'), ('social', 'mix'),
      ('one-on-one', 'small'), ('small', 'one-on-one'), ('small', 'group'), ('group', 'small')
    ) then
      v_style_points := v_style_points + 0.5;
    end if;
  end loop;

  v_interest_ratio := cardinality(v_interests)::numeric
    / greatest(1, least(cardinality(a.interests), cardinality(b.interests)));
  v_event_ratio := case when cardinality(v_events) = 0 then 0 else least(1, 0.6 + 0.2 * cardinality(v_events)) end;
  v_pref_ratio := case
    when a.meet_preference is null or b.meet_preference is null then 1
    when a.meet_preference = 'either' or b.meet_preference = 'either' then 1
    when a.meet_preference = b.meet_preference then 1
    else 0.3
  end;

  -- 5 = number of friendship-style questions in src/data/styleQuestions.ts
  v_raw := v_interest_ratio * 0.45 + (v_style_points / 5) * 0.3 + v_event_ratio * 0.15 + v_pref_ratio * 0.1;

  score := least(98, round(58 + v_raw * 40))::smallint;
  shared_interests := v_interests;
  shared_event_ids := v_events;
  shared_style := v_style;
  return next;
end;
$$;

-- Closes a match: status, contact shares erased, meetup cancelled, consents withdrawn.
create function private.close_match(p_match_id uuid, p_status public.match_status, p_by uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.matches
     set status = p_status, ended_by = p_by, ended_at = now()
   where id = p_match_id and status = 'active';

  update public.contact_shares
     set value = null, revoked_at = now()
   where match_id = p_match_id and revoked_at is null;

  update public.meetups
     set status = 'cancelled', cancelled_at = now()
   where match_id = p_match_id and status = 'unlocked';

  update public.meetup_consents
     set status = 'withdrawn'
   where match_id = p_match_id and status = 'interested';
end;
$$;

-- ---------------------------------------------------------------------------
-- Quest
-- ---------------------------------------------------------------------------

-- Marks the caller's quest complete after validating their saved answers.
-- Clients write their answers with ordinary owner-only UPDATEs first.
create function public.complete_quest()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_profile public.profiles;
  v_private public.profile_private;
  v_missing text[] := '{}';
  v_done timestamptz;
begin
  select * into v_profile from public.profiles where id = v_uid;
  select * into v_private from public.profile_private where user_id = v_uid;

  if v_profile.id is null then
    raise exception 'Profile not found' using errcode = 'P0001';
  end if;

  if v_profile.first_name is null then v_missing := v_missing || 'first name'; end if;
  if v_profile.program is null then v_missing := v_missing || 'program'; end if;
  if v_profile.year_of_study is null then v_missing := v_missing || 'year of study'; end if;
  if v_profile.meet_preference is null then v_missing := v_missing || 'meeting preference'; end if;
  if cardinality(v_profile.interests) < 4 then v_missing := v_missing || 'at least 4 interests'; end if;
  if (select count(*) from jsonb_object_keys(v_profile.style_answers)) < 5 then
    v_missing := v_missing || 'friendship style answers';
  end if;
  if v_profile.meet_preference = 'event'
     and not exists (select 1 from public.event_availability ea where ea.user_id = v_uid) then
    v_missing := v_missing || 'at least one event';
  end if;
  if v_private.guidelines_accepted_at is null then
    v_missing := v_missing || 'community guidelines agreement';
  end if;

  if cardinality(v_missing) > 0 then
    raise exception 'Quest incomplete: %', array_to_string(v_missing, ', ') using errcode = 'P0001';
  end if;

  update public.profiles
     set quest_completed_at = coalesce(quest_completed_at, now())
   where id = v_uid
  returning quest_completed_at into v_done;

  return v_done;
end;
$$;

-- ---------------------------------------------------------------------------
-- Matchmaking
-- ---------------------------------------------------------------------------

-- Matches the caller with the most compatible waiting student at the same
-- university, or puts them in the waiting pool.
-- Returns {"status":"matched","match_id":...} or {"status":"waiting"}.
create function public.request_match()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_me public.profiles;
  v_match_id uuid;
  v_candidate uuid;
  v_fit record;
begin
  select * into v_me from public.profiles where id = v_uid;
  if v_me.id is null or v_me.quest_completed_at is null then
    raise exception 'Complete Friendship Quest before matching' using errcode = 'P0001';
  end if;

  -- Serialise matchmaking per campus so two requests can never claim the same student.
  perform pg_advisory_xact_lock(hashtext('friendship-quest:match:' || v_me.university_id));

  -- Idempotent: already in an active match? Return it.
  select m.id into v_match_id
  from public.matches m
  join public.match_members mm on mm.match_id = m.id
  where mm.user_id = v_uid and m.status = 'active'
  limit 1;

  if v_match_id is not null then
    return jsonb_build_object('status', 'matched', 'match_id', v_match_id);
  end if;

  select r.user_id into v_candidate
  from public.match_requests r
  join public.profiles p on p.id = r.user_id
  where r.status = 'waiting'
    and r.university_id = v_me.university_id
    and p.university_id = v_me.university_id
    and p.quest_completed_at is not null
    and r.user_id <> v_uid
    and not private.is_blocked_pair(v_uid, r.user_id)
    and not exists (
      select 1 from public.matches pm where pm.pair_key = private.pair_key(v_uid, r.user_id)
    )
    and not exists (
      select 1
      from public.match_members cm
      join public.matches cmm on cmm.id = cm.match_id
      where cm.user_id = r.user_id and cmm.status = 'active'
    )
  order by (select c.score from private.compatibility(v_uid, r.user_id) c) desc, r.created_at asc
  limit 1;

  if v_candidate is null then
    insert into public.match_requests (user_id, university_id, status)
    values (v_uid, v_me.university_id, 'waiting')
    on conflict (user_id) do update
      set status = 'waiting', university_id = excluded.university_id;
    return jsonb_build_object('status', 'waiting');
  end if;

  select * into v_fit from private.compatibility(v_uid, v_candidate);

  insert into public.matches (university_id, pair_key, compatibility, shared_interests, shared_event_ids, shared_style)
  values (v_me.university_id, private.pair_key(v_uid, v_candidate), v_fit.score,
          v_fit.shared_interests, v_fit.shared_event_ids, v_fit.shared_style)
  returning id into v_match_id;

  insert into public.match_members (match_id, user_id)
  values (v_match_id, v_uid), (v_match_id, v_candidate);

  insert into public.match_requests (user_id, university_id, status)
  values (v_uid, v_me.university_id, 'matched')
  on conflict (user_id) do update set status = 'matched';

  update public.match_requests set status = 'matched' where user_id = v_candidate;

  insert into public.messages (match_id, sender_id, kind, body)
  values (v_match_id, null, 'system',
          format('You matched at %s%% compatibility. Say hi! 👋', v_fit.score));

  return jsonb_build_object('status', 'matched', 'match_id', v_match_id);
end;
$$;

create function public.cancel_match_request()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.match_requests
     set status = 'cancelled'
   where user_id = private.require_user() and status = 'waiting';
end;
$$;

-- The ONLY way to read another student's profile: a fixed, minimal projection,
-- and only for a member of the match.
create function public.get_match_partner(p_match_id uuid)
returns table (user_id uuid, first_name text, avatar text, program text, year_of_study public.year_of_study)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_member(p_match_id);
  return query
    select p.id, p.first_name, p.avatar, p.program, p.year_of_study
    from public.match_members mm
    join public.profiles p on p.id = mm.user_id
    where mm.match_id = p_match_id
      and mm.user_id <> (select auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- Meetup consent
-- ---------------------------------------------------------------------------

-- Status as seen by the CALLER. 'waiting' reflects only the caller's own
-- interest, so a one-sided "yes" from the partner is never revealed.
create function public.get_meetup_status(p_match_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_meetup public.meetups;
  v_mine public.meetup_consents;
begin
  perform private.require_member(p_match_id);

  select * into v_meetup from public.meetups where match_id = p_match_id and status = 'unlocked';
  if v_meetup.match_id is not null then
    return jsonb_build_object('status', 'unlocked', 'event_id', v_meetup.event_id);
  end if;

  select * into v_mine from public.meetup_consents
   where match_id = p_match_id and user_id = v_uid and status = 'interested';
  if v_mine.match_id is not null then
    return jsonb_build_object('status', 'waiting', 'event_id', v_mine.event_id);
  end if;

  return jsonb_build_object('status', 'none');
end;
$$;

-- Records the caller's OWN consent. Only events both members selected
-- (matches.shared_event_ids) that are published and upcoming are allowed.
create function public.set_meetup_consent(p_match_id uuid, p_event_id uuid, p_interested boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_match public.matches := private.require_member(p_match_id);
begin
  if v_match.status <> 'active' then
    raise exception 'This match is closed' using errcode = 'P0001';
  end if;

  if p_interested then
    if p_event_id is null or not (p_event_id = any (v_match.shared_event_ids)) then
      raise exception 'You can only choose an event you are both available for' using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from public.events e
      where e.id = p_event_id and e.is_published and e.starts_at > now()
    ) then
      raise exception 'That event is no longer available' using errcode = 'P0001';
    end if;

    insert into public.meetup_consents (match_id, user_id, event_id, status)
    values (p_match_id, v_uid, p_event_id, 'interested')
    on conflict (match_id, user_id) do update
      set event_id = excluded.event_id, status = 'interested';
  else
    update public.meetup_consents
       set status = 'withdrawn'
     where match_id = p_match_id and user_id = v_uid;
  end if;

  return public.get_meetup_status(p_match_id);
end;
$$;

-- Trigger: unlock a meetup only when BOTH members are interested in the SAME
-- event on an active match; otherwise cancel any unlocked meetup.
create function private.sync_meetup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event uuid;
begin
  select c1.event_id into v_event
  from public.meetup_consents c1
  join public.meetup_consents c2
    on c2.match_id = c1.match_id and c2.user_id <> c1.user_id and c2.event_id = c1.event_id
  join public.matches m on m.id = c1.match_id
  where c1.match_id = new.match_id
    and c1.status = 'interested'
    and c2.status = 'interested'
    and m.status = 'active'
  limit 1;

  if v_event is not null then
    insert into public.meetups as mt (match_id, event_id, status, unlocked_at, cancelled_at)
    values (new.match_id, v_event, 'unlocked', now(), null)
    on conflict (match_id) do update
      set event_id = excluded.event_id,
          status = 'unlocked',
          unlocked_at = case when mt.status = 'unlocked' and mt.event_id = excluded.event_id
                             then mt.unlocked_at else now() end,
          cancelled_at = null;
  else
    update public.meetups
       set status = 'cancelled', cancelled_at = now()
     where match_id = new.match_id and status = 'unlocked';
  end if;

  return null;
end;
$$;

create trigger meetup_consents_sync_meetup
  after insert or update on public.meetup_consents
  for each row execute function private.sync_meetup();

-- ---------------------------------------------------------------------------
-- Contact sharing (owner action only)
-- ---------------------------------------------------------------------------

-- Shares the CALLER's own contact detail with their match partner. The value is
-- read server-side (email from auth.users), so a client can neither share
-- someone else's details nor fake their own.
create function public.share_contact(p_match_id uuid, p_channel public.contact_channel)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_match public.matches := private.require_member(p_match_id);
  v_value text;
begin
  if v_match.status <> 'active' or not private.can_message(p_match_id) then
    raise exception 'This match is closed' using errcode = 'P0001';
  end if;

  if p_channel = 'instagram' then
    select pp.instagram into v_value from public.profile_private pp where pp.user_id = v_uid;
  else
    select u.email into v_value from auth.users u where u.id = v_uid;
  end if;

  if v_value is null or btrim(v_value) = '' then
    raise exception 'Add your % before sharing it', p_channel using errcode = 'P0001';
  end if;

  insert into public.contact_shares (match_id, owner_id, channel, value, shared_at, revoked_at)
  values (p_match_id, v_uid, p_channel, v_value, now(), null)
  on conflict (match_id, owner_id, channel) do update
    set value = excluded.value, shared_at = now(), revoked_at = null;

  update public.match_members
     set keep_chatting_here = false
   where match_id = p_match_id and user_id = v_uid;
end;
$$;

-- Hides the caller's own shared detail again (the value is erased).
create function public.revoke_contact(p_match_id uuid, p_channel public.contact_channel)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  perform private.require_member(p_match_id);
  update public.contact_shares
     set value = null, revoked_at = now()
   where match_id = p_match_id and owner_id = v_uid and channel = p_channel and revoked_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Safety
-- ---------------------------------------------------------------------------

create function public.block_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_partner uuid;
begin
  perform private.require_member(p_match_id);
  v_partner := private.partner_of(p_match_id);

  if v_partner is not null then
    insert into public.blocks (blocker_id, blocked_id, match_id)
    values (v_uid, v_partner, p_match_id)
    on conflict (blocker_id, blocked_id) do nothing;
  end if;

  perform private.close_match(p_match_id, 'blocked', v_uid);
end;
$$;

create function public.unmatch(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  perform private.require_member(p_match_id);
  perform private.close_match(p_match_id, 'unmatched', v_uid);
end;
$$;

-- Files a report about the caller's match partner (derived server-side, so a
-- client cannot target arbitrary users). Optionally blocks in the same call.
create function public.report_match(
  p_match_id uuid,
  p_reason public.report_reason,
  p_details text default '',
  p_also_block boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_partner uuid;
  v_report_id uuid;
begin
  perform private.require_member(p_match_id);
  v_partner := private.partner_of(p_match_id);

  insert into public.reports (match_id, reporter_id, reported_id, reason, details, also_blocked)
  values (p_match_id, v_uid, v_partner, p_reason, left(coalesce(btrim(p_details), ''), 600), coalesce(p_also_block, false))
  returning id into v_report_id;

  if p_also_block then
    perform public.block_match(p_match_id);
  end if;

  return v_report_id;
end;
$$;

-- If a member disappears (account deletion), close the match for the other.
create function private.close_match_on_member_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.matches
     set status = 'unmatched', ended_at = now()
   where id = old.match_id and status = 'active';
  return old;
end;
$$;

create trigger match_members_close_on_delete
  after delete on public.match_members
  for each row execute function private.close_match_on_member_removed();

-- ---------------------------------------------------------------------------
-- Execute privileges: clients may call the public RPCs, nothing else.
-- ---------------------------------------------------------------------------
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_match_member(uuid) to authenticated;
grant execute on function private.can_message(uuid) to authenticated;
grant execute on function private.is_slug_list(text[]) to authenticated;

revoke all on function public.complete_quest() from public, anon;
revoke all on function public.request_match() from public, anon;
revoke all on function public.cancel_match_request() from public, anon;
revoke all on function public.get_match_partner(uuid) from public, anon;
revoke all on function public.get_meetup_status(uuid) from public, anon;
revoke all on function public.set_meetup_consent(uuid, uuid, boolean) from public, anon;
revoke all on function public.share_contact(uuid, public.contact_channel) from public, anon;
revoke all on function public.revoke_contact(uuid, public.contact_channel) from public, anon;
revoke all on function public.block_match(uuid) from public, anon;
revoke all on function public.unmatch(uuid) from public, anon;
revoke all on function public.report_match(uuid, public.report_reason, text, boolean) from public, anon;

grant execute on function public.complete_quest() to authenticated;
grant execute on function public.request_match() to authenticated;
grant execute on function public.cancel_match_request() to authenticated;
grant execute on function public.get_match_partner(uuid) to authenticated;
grant execute on function public.get_meetup_status(uuid) to authenticated;
grant execute on function public.set_meetup_consent(uuid, uuid, boolean) to authenticated;
grant execute on function public.share_contact(uuid, public.contact_channel) to authenticated;
grant execute on function public.revoke_contact(uuid, public.contact_channel) to authenticated;
grant execute on function public.block_match(uuid) to authenticated;
grant execute on function public.unmatch(uuid) to authenticated;
grant execute on function public.report_match(uuid, public.report_reason, text, boolean) to authenticated;
