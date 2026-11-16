-- =============================================================================
-- LOCAL TEST HARNESS ONLY: a minimal pgTAP-compatible subset for PGlite.
--
-- On real Supabase (`supabase test db`) the genuine pgTAP extension is used.
-- This shim implements only the functions our tests call, with the same
-- signatures and TAP output: plan, ok, is, isnt, lives_ok, throws_ok, finish.
-- Counters live in transaction-scoped GUCs, so they work under any role.
-- =============================================================================

create function extensions._tap_record(passed boolean, descr text, diag text default null)
returns text
language plpgsql
as $$
declare
  n integer := coalesce(nullif(current_setting('tap.n', true), ''), '0')::integer + 1;
  failed integer := coalesce(nullif(current_setting('tap.failed', true), ''), '0')::integer;
  line text;
begin
  perform set_config('tap.n', n::text, false);
  if passed then
    line := 'ok ' || n || ' - ' || coalesce(descr, '');
  else
    perform set_config('tap.failed', (failed + 1)::text, false);
    line := 'not ok ' || n || ' - ' || coalesce(descr, '');
    if diag is not null then
      line := line || E'\n#   ' || replace(diag, E'\n', E'\n#   ');
    end if;
  end if;
  return line;
end;
$$;

create function extensions.plan(integer) returns text language plpgsql as $$
begin
  perform set_config('tap.plan', $1::text, false);
  perform set_config('tap.n', '0', false);
  perform set_config('tap.failed', '0', false);
  return '1..' || $1;
end;
$$;

create function extensions.ok(boolean, text) returns text language sql as $$
  select extensions._tap_record(coalesce($1, false), $2, case when $1 is null then 'got NULL' end);
$$;

create function extensions.is(anyelement, anyelement, text) returns text language sql as $$
  select extensions._tap_record($1 is not distinct from $2, $3,
    format('have: %s' || E'\n' || 'want: %s', coalesce($1::text, 'NULL'), coalesce($2::text, 'NULL')));
$$;

create function extensions.isnt(anyelement, anyelement, text) returns text language sql as $$
  select extensions._tap_record($1 is distinct from $2, $3,
    format('have: %s' || E'\n' || 'want anything else', coalesce($1::text, 'NULL')));
$$;

create function extensions.lives_ok(text, text) returns text language plpgsql as $$
declare
  err text;
begin
  begin
    execute $1;
  exception when others then
    err := sqlstate || ': ' || sqlerrm;
  end;
  return extensions._tap_record(err is null, $2, 'died: ' || err);
end;
$$;

create function extensions.throws_ok(text, char(5), text, text) returns text language plpgsql as $$
declare
  st text;
  msg text;
begin
  begin
    execute $1;
  exception when others then
    st := sqlstate;
    msg := sqlerrm;
  end;
  if st is null then
    return extensions._tap_record(false, $4, 'no exception thrown');
  end if;
  return extensions._tap_record(
    ($2 is null or st = $2) and ($3 is null or msg = $3),
    $4,
    format('caught: %s: %s' || E'\n' || 'wanted: %s: %s', st, msg, coalesce($2, 'any'), coalesce($3, '(any message)'))
  );
end;
$$;

create function extensions.finish() returns setof text language plpgsql as $$
declare
  planned integer := nullif(current_setting('tap.plan', true), '')::integer;
  ran integer := coalesce(nullif(current_setting('tap.n', true), ''), '0')::integer;
  failed integer := coalesce(nullif(current_setting('tap.failed', true), ''), '0')::integer;
begin
  if planned is not null and planned <> ran then
    return next '# Looks like you planned ' || planned || ' tests but ran ' || ran;
  end if;
  if failed > 0 then
    return next '# Looks like you failed ' || failed || ' test' || case when failed = 1 then '' else 's' end || ' of ' || ran;
  end if;
end;
$$;

grant execute on all functions in schema extensions to anon, authenticated, service_role;
