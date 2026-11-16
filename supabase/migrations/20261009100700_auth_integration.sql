-- =============================================================================
-- Friendship Quest · 08 · Auth integration
--
-- Two layers keep sign-up university-only:
--  1. public.hook_restrict_university_email: a "Before User Created" Auth hook
--     that returns a friendly 403. Must be ENABLED in the dashboard
--     (Authentication → Hooks) or config.toml for local dev.
--  2. private.handle_new_user: a trigger on auth.users that refuses to create
--     the user if the domain isn't allowed, even if the hook is misconfigured.
-- =============================================================================

-- Maps an email to an active university by exact domain or subdomain.
-- 'student@mail.ualberta.ca' → ualberta; 'x@ualberta.ca.evil.com' → null.
create function private.university_for_email(p_email text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  with parts as (
    select lower(split_part(btrim(p_email), '@', 2)) as domain
    where btrim(coalesce(p_email, '')) ~ '^[^@\s]+@[^@\s]+$'
  )
  select u.id
  from public.universities u, parts
  where u.is_active
    and (parts.domain = u.email_domain or parts.domain like ('%.' || u.email_domain))
  order by char_length(u.email_domain) desc
  limit 1;
$$;

revoke all on function private.university_for_email(text) from public, anon, authenticated;

-- Creates the owner-only rows for every new auth user.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_university text := private.university_for_email(new.email);
begin
  if v_university is null then
    raise exception 'Friendship Quest is only open to verified university email addresses'
      using errcode = '42501';
  end if;

  insert into public.profiles (id, university_id) values (new.id, v_university);
  insert into public.profile_private (user_id) values (new.id);
  insert into public.player_progress (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- A student may not move their account to a non-university address or to a
-- different university (which would bypass campus scoping).
create function private.guard_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_university text := private.university_for_email(new.email);
begin
  if v_university is null then
    raise exception 'Your account email must stay a university email address' using errcode = '42501';
  end if;
  if v_university is distinct from (select p.university_id from public.profiles p where p.id = new.id) then
    raise exception 'Changing university is not supported; please contact the FAC team' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  before update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function private.guard_email_change();

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.guard_email_change() from public, anon, authenticated;

-- Before User Created hook. Payload: { "user": { "email": ... }, ... }.
-- Returning {} allows the sign-up; returning { "error": {...} } rejects it.
create function public.hook_restrict_university_email(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if private.university_for_email(event -> 'user' ->> 'email') is null then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Please use your university email address. Friendship Quest is only open to verified students.'
      )
    );
  end if;
  return '{}'::jsonb;
end;
$$;

-- Only the Auth server may call the hook.
revoke all on function public.hook_restrict_university_email(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_restrict_university_email(jsonb) to supabase_auth_admin;
