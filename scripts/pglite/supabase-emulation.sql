-- =============================================================================
-- LOCAL TEST HARNESS ONLY: never applied to a real Supabase project.
--
-- Recreates the small part of a Supabase database our migrations depend on, so
-- scripts/db-test-pglite.mjs can run the real migrations and pgTAP tests on
-- PGlite (PostgreSQL compiled to WebAssembly) when Docker isn't available.
--
-- Mirrors Supabase behaviour that matters for security:
--   * API roles anon / authenticated / service_role, plus supabase_auth_admin
--   * auth.uid() / auth.role() / auth.jwt() read the request.jwt.claims GUC
--   * clients have NO privileges on auth.users
--   * Supabase's default privileges: new objects in `public` are granted to the
--     API roles (so our migrations must revoke, exactly as on the real platform)
--   * a `supabase_realtime` publication
-- =============================================================================

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role supabase_auth_admin nologin noinherit;

create schema auth;
create schema extensions;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  email_change text,
  raw_app_meta_data jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  email_confirmed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;

create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;
$$;

create function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  );
$$;

grant execute on function auth.uid(), auth.role(), auth.jwt() to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

create publication supabase_realtime;
