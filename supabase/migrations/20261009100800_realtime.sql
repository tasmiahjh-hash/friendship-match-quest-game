-- =============================================================================
-- Friendship Quest · 09 · Realtime
-- Postgres Changes are filtered per subscriber by the same RLS SELECT policies,
-- so members only receive rows from their own matches.
-- meetup_consents is deliberately NOT published: one-sided consent stays private.
-- =============================================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime
      add table public.messages, public.matches, public.match_members, public.meetups, public.contact_shares;
  else
    raise notice 'supabase_realtime publication not found; skipping (non-Supabase database)';
  end if;
end;
$$;
