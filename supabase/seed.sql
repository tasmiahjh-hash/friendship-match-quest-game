-- =============================================================================
-- DEVELOPMENT SEED · FICTIONAL DEMO DATA ONLY
--
-- Loaded by `supabase db reset` (local) only. Never run against production.
-- Every university and event below is made up and flagged is_demo = true.
-- There is NO student/personal data here, and there must never be.
--
-- To test sign-up locally, use any address at a demo domain
-- (e.g. alice@mapleridge.edu). Local Supabase captures all email in Mailpit
-- (http://127.0.0.1:54324), so these fictional domains still work for OTPs.
-- =============================================================================

insert into public.universities (id, name, short_name, emoji, email_domain, is_active, is_demo) values
  ('maple',     'Maple Ridge University (demo)',  'MRU', '🍁', 'mapleridge.edu',  true, true),
  ('lakeshore', 'Lakeshore College (demo)',       'LSC', '🌊', 'lakeshore.ac.uk', true, true),
  ('northgate', 'Northgate Institute (demo)',     'NGI', '🏔️', 'northgate.edu',   true, true),
  ('harbour',   'Harbour City University (demo)', 'HCU', '⚓', 'harbourcity.edu', true, true)
on conflict (id) do nothing;

-- Dates are relative to the time the seed runs, so the demo never goes stale.
-- Slugs match src/data/events.ts in the client.
insert into public.events
  (university_id, slug, name, emoji, description, location, host, starts_at, ends_at, gradient, capacity, is_published, is_demo)
select
  u.id, e.slug, e.name, e.emoji, e.description, e.location, 'FAC team',
  date_trunc('day', now()) + e.starts_in,
  date_trunc('day', now()) + e.starts_in + e.duration,
  e.gradient, e.capacity, true, true
from public.universities u
cross join (values
  ('craft-connect',    'Craft & Connect',  '🧶', 'Friendship bracelets, mini canvases and cocoa. Zero skill required. (demo event)',
     'Student Union, Room 204',  interval '6 days 18 hours',    interval '2 hours',    array['#ff7eb6', '#a78bfa'], 18),
  ('karaoke-night',    'Karaoke Night',    '🎤', 'Solo, duet, or just cheer from the comfy seats. Mocktails on us. (demo event)',
     'The Commons Lounge',       interval '13 days 19 hours 30 minutes', interval '2 hours 30 minutes', array['#6cc6ff', '#7c6cff'], 24),
  ('halloween-social', 'Halloween Social', '🎃', 'Costumes optional, pumpkin carving encouraged, spooky snacks guaranteed. (demo event)',
     'Great Hall',               interval '21 days 19 hours',   interval '3 hours',    array['#ff9f43', '#ff5e62'], 40),
  ('games-night',      'Games Night',      '🎲', 'Board games, card games and a very competitive Mario Kart bracket. (demo event)',
     'Library Learning Commons', interval '28 days 18 hours 30 minutes', interval '3 hours', array['#5ee2b5', '#3aa0ff'], 30)
) as e (slug, name, emoji, description, location, starts_in, duration, gradient, capacity)
where u.is_demo
on conflict (university_id, slug) do nothing;
