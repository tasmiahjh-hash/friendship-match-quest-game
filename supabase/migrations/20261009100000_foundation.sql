-- =============================================================================
-- Friendship Quest · 01 · Foundation
-- Schemas, enum types and shared utility functions.
-- =============================================================================

-- Internal helpers live in `private`. PostgREST only exposes `public`, so nothing
-- in here is callable as an RPC. A couple of RLS helper functions are granted to
-- `authenticated` later because policies execute with the caller's privileges.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Enum values intentionally match the strings the React client already uses.
create type public.year_of_study as enum ('1st', '2nd', '3rd', '4th', 'Grad');
create type public.meet_preference as enum ('chat-first', 'event', 'either');
create type public.match_request_status as enum ('waiting', 'matched', 'cancelled');
create type public.match_status as enum ('active', 'unmatched', 'blocked');
create type public.message_kind as enum ('text', 'system');
create type public.consent_status as enum ('interested', 'withdrawn');
create type public.meetup_status as enum ('unlocked', 'cancelled');
create type public.contact_channel as enum ('instagram', 'email');
create type public.report_reason as enum ('harassment', 'inappropriate', 'pressure', 'spam', 'unsafe', 'other');
create type public.report_status as enum ('open', 'reviewing', 'closed');

-- Keeps updated_at honest regardless of what a client sends.
create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- True when every element is a short lowercase slug (interest ids, course-free tags, ...).
create function private.is_slug_list(items text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(item ~ '^[a-z0-9-]{1,32}$'), true)
  from unnest(items) as item;
$$;

-- Canonical, order-independent key for a pair of users.
create function private.pair_key(a uuid, b uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select least(a, b)::text || ':' || greatest(a, b)::text;
$$;

revoke all on all functions in schema private from public;
