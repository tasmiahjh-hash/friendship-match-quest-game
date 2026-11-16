# Friendship Quest: Supabase backend plan

Branch: `real-backend` · Baseline: `main @ 4526705` (working mock prototype)

## Milestone 1 (definition of done)

Two university students, on two different browsers/devices, can each:

1. Sign up with a verified university email.
2. Complete Friendship Quest (profile saved server-side).
3. Be matched with each other.
4. Open the same private Match Room.
5. Exchange messages that appear in real time on the other device.

Block must stop messaging in both directions; report and unmatch must work. Meetup consent and contact sharing get their schema and policies in Milestone 1, but the UI wiring lands in Phase 6.

---

## 1. Current architecture and where the seams are

| Concern | Today | Seam |
| --- | --- | --- |
| Static catalogue (universities, events) | `data/campus.ts`, `data/events.ts` | Fetched from DB; static files kept for mock mode |
| Interests, questions, badges, copy | `data/*.ts` | **Stay client-side**; DB stores only their ids |
| Player profile, XP, badges | `GameState.profile` in a reducer + `localStorage` | Persisted on quest completion; localStorage keeps only the pre-signup draft |
| Matching | `MatchProvider` interface + `mockMatchProvider` over `MOCK_STUDENTS` | `request_match()` RPC in Postgres |
| Other user's behaviour | `useMockPeer` (replies, consent, contact share) | `useMatchRoom(matchId)`: realtime subscription + RPCs |
| Chat, meetup, sharing, safety state | Reducer actions | Server is the source of truth; reducer mirrors it |
| Stage/achievement derivation | `deriveStage`, `applyProgression` | Unchanged; fed with server data |

UI components (`ui/*`, levels 1–4, `ChatThread`, `Composer`, styles) need little or no change.

A data-mode flag (`VITE_DATA_MODE=mock|supabase`) keeps the current mock demo fully working throughout, so the presenter flow never breaks.

---

## 2. Authentication

- **Supabase Auth, email one-time code (OTP), no passwords.** The 6-digit code proves the student owns the inbox, which is the "university email = students only" guarantee.
- **Domain restriction is enforced server-side** with a *Before User Created* auth hook (a Postgres function) that rejects any email whose domain isn't in `universities.email_domain`. The client-side domain check stays as a UX hint only.
- **UX (preserves the current flow):** Levels 1–4 can still be played before signing in; they persist in the existing `localStorage` draft. Level 5 ("Your Card") gains a "Send code → enter code" step on the email field. Once verified, `complete_quest(...)` saves everything in one transaction.
- **Returning users:** a "Sign in" link on the Welcome screen (same OTP flow), which restores profile/match from the server.
- **Profile bootstrap:** an `on auth.users insert` trigger creates empty `profiles` and `profile_private` rows.
- **Keys:** the frontend only ever holds the project URL and the **anon/publishable** key (safe by design; security comes from RLS). The **service-role key is never placed in this repo**, any `VITE_*` variable or the browser. Nothing in Milestone 1 needs it at all.

---

## 3. Database schema

All tables live in `public`, all have RLS enabled, default deny. `uuid` ids use `gen_random_uuid()`. Every user FK is `on delete cascade` to `auth.users`, so deleting an account removes its data.

### Catalogue (read-only to clients)

**`universities`**
| column | type | notes |
| --- | --- | --- |
| id | text pk | e.g. `ualberta` |
| name, short_name, emoji | text | |
| email_domain | text unique | used by the signup hook |
| is_active | bool | |

**`events`**
| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| university_id | text fk → universities | |
| name, emoji, location, host, description | text | |
| starts_at, ends_at | timestamptz | replaces the `date` + `time` strings |
| gradient | text[2] | UI colours |
| capacity | int | |
| is_published | bool | |

### People

**`profiles`**: non-sensitive quest data. Selectable **only by its owner** (see RLS).
| column | type | notes |
| --- | --- | --- |
| id | uuid pk fk → auth.users | |
| first_name | text (1–30) | |
| avatar | text | emoji |
| university_id | text fk | set from the verified email domain, never from client input |
| program | text | |
| year_of_study | enum `year_of_study` | `1st…Grad` |
| courses | text[] | |
| interests | text[] | ids from `data/interests.ts`; check constraint on length 4–8 |
| style_answers | jsonb | `{ night: 'quiet', … }` |
| meet_preference | enum `meet_preference` | |
| quest_completed_at | timestamptz | null until done |
| created_at, updated_at | timestamptz | |

**`profile_private`**: owner-only, never joined into any shared query.
| column | type |
| --- | --- |
| user_id | uuid pk fk |
| instagram | text null |
| guidelines_version | text |
| guidelines_accepted_at | timestamptz |

The university email is **not copied** anywhere; it stays in `auth.users` and is only read by `share_contact()` when the owner explicitly shares it.

**`event_availability`**: owner-only; matching reads it via a `security definer` function.
`(user_id fk, event_id fk)` composite pk.

**`player_progress`**: gamification (owner-only, client-writable; low stakes).
`user_id pk, xp int, achievements text[], claimed_rewards text[], updated_at`

### Matching

**`match_requests`**: the waiting pool.
`user_id pk, university_id, status enum('waiting','matched','cancelled'), created_at`

**`matches`**
| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| university_id | text | |
| compatibility | smallint | |
| shared_interests | text[] | computed at match time |
| shared_event_ids | uuid[] | computed at match time, so neither user reads the other's availability |
| shared_style | jsonb | `{ night: 'quiet' }`, only the answers that are equal |
| status | enum `match_status` | `active`, `unmatched`, `blocked` |
| ended_by | uuid null | |
| ended_at | timestamptz null | |
| created_at | timestamptz | |

**`match_members`**: who belongs to a match, plus per-user room state.
| column | type | notes |
| --- | --- | --- |
| match_id | uuid fk | pk (match_id, user_id) |
| user_id | uuid fk | |
| keep_chatting_here | bool | the "Keep chatting here" choice |
| last_read_at | timestamptz | |
| joined_at | timestamptz | |

A separate members table (instead of `user_a/user_b` columns) makes the RLS helper, "my matches" queries and the realtime filter (`user_id=eq.<me>`) simple.

### Room

**`messages`**
| column | type | notes |
| --- | --- | --- |
| id | uuid pk | client-generated so optimistic sends can be de-duplicated |
| match_id | uuid fk, indexed | |
| sender_id | uuid fk | |
| body | text, 1–1000 chars | |
| kind | enum `message_kind` | `text`, `system` |
| created_at | timestamptz default now() | |

Messages are immutable for Milestone 1 (no update or delete policy).

**`meetup_consents`**: one row per user, private to that user.
`match_id, user_id, event_id, status enum('interested','withdrawn'), updated_at`, pk (match_id, user_id)

**`meetups`**: written only by a trigger when *both* consents say `interested` for the same event; visible to both members.
`match_id pk, event_id, unlocked_at, cancelled_at`

**`contact_shares`**: one row per (match, owner, channel), created only by `share_contact()`.
`match_id, owner_id, channel enum('instagram','email'), value text, shared_at, revoked_at`, pk (match_id, owner_id, channel)

### Safety

**`blocks`**: `blocker_id, blocked_id, match_id null, created_at`, pk (blocker_id, blocked_id)

**`reports`**
| column | type |
| --- | --- |
| id | uuid pk |
| match_id | uuid fk |
| reporter_id, reported_id | uuid fk |
| reason | enum `report_reason` |
| details | text (≤600) |
| also_blocked | bool |
| status | enum `open`, `reviewing`, `closed` |
| created_at | timestamptz |

### Relationships

```
auth.users 1─1 profiles
auth.users 1─1 profile_private
auth.users 1─1 player_progress
auth.users 1─* event_availability *─1 events *─1 universities
auth.users 1─1 match_requests
matches 1─2 match_members *─1 auth.users
matches 1─* messages
matches 1─2 meetup_consents → events
matches 1─0..1 meetups → events
matches 1─* contact_shares
auth.users 1─* blocks (as blocker / blocked)
matches 1─* reports
```

---

## 4. RLS strategy

**Principles**

1. RLS is on for every table, and there is no policy for `anon` anywhere.
2. Membership checks go through one helper, so policies stay short and can't recurse:
   ```sql
   create function public.is_match_member(m uuid) returns boolean
   language sql stable security definer set search_path = public as $$
     select exists (select 1 from match_members where match_id = m and user_id = auth.uid());
   $$;
   ```
3. **Anything that crosses user boundaries or has invariants is an RPC, not a table write.** Matching, blocking, unmatching, contact sharing and quest completion are `security definer` functions with `set search_path = public`, `auth.uid()` checks and `execute` granted to `authenticated` only. Clients get no direct insert/update on `matches`, `match_members`, `meetups`, `contact_shares` or `blocks`.
4. The partner's profile is **never** read from `profiles`. `get_match_partner(match_id)` returns only `first_name, avatar, program, year_of_study`, and only to a member of that match. Adding a column to `profiles` can therefore never leak it by accident.

**Policies**

| Table | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| universities, events | `authenticated` (events: published + own university) | none | none | none |
| profiles | `id = auth.uid()` | none (trigger) | own row; `university_id` not updatable (column privilege) | none |
| profile_private | own row | none (trigger) | own row | none |
| event_availability | own rows | own rows | none | own rows |
| player_progress | own row | own row | own row | none |
| match_requests | own row | via `request_match()` | via RPC | none |
| matches | `is_match_member(id)` | RPC only | RPC only | none |
| match_members | `is_match_member(match_id)` | RPC only | own row, `keep_chatting_here`/`last_read_at` only | none |
| messages | `is_match_member(match_id)` | see below | none | none |
| meetup_consents | **own row only** (your "yes" stays private until mutual) | own row, member, event ∈ `shared_event_ids` | own row | none |
| meetups | `is_match_member(match_id)` | trigger only | none | none |
| contact_shares | `is_match_member(match_id) and (owner_id = auth.uid() or revoked_at is null)` | `share_contact()` only | `revoke_contact()` only | none |
| blocks | `blocker_id = auth.uid()` | `block_match()` only | none | none |
| reports | `reporter_id = auth.uid()` | own, member of match | none | none |

**Message insert policy (the blocking guarantee)**

```sql
create policy "members send to active, unblocked matches" on messages
for insert to authenticated with check (
  sender_id = auth.uid()
  and kind = 'text'
  and exists (
    select 1 from matches m
    where m.id = match_id and m.status = 'active'
  )
  and is_match_member(match_id)
  and not exists (
    select 1 from blocks b
    join match_members other on other.match_id = messages.match_id and other.user_id <> auth.uid()
    where (b.blocker_id = auth.uid() and b.blocked_id = other.user_id)
       or (b.blocker_id = other.user_id and b.blocked_id = auth.uid())
  )
);
```

`block_match()` also sets `matches.status = 'blocked'`, so either check alone stops messaging. Realtime `postgres_changes` enforces the same select policies per subscriber.

**How the privacy requirements map**

| Requirement | Enforced by |
| --- | --- |
| Email/contact never exposed via profile queries | Email stays in `auth.users`; Instagram is in owner-only `profile_private`; partner data only via `get_match_partner()` |
| Only matches you belong to | `is_match_member` on `matches` / `match_members` |
| Only messages of your matches | `is_match_member` on `messages` select, and realtime uses the same RLS |
| Blocking prevents messaging | Insert policy above + `matches.status` |
| Sharing needs the owner's explicit action | `contact_shares` writable only by `share_contact(match, channel)`, which uses `auth.uid()` as owner and copies the value server-side |
| Meetup consent recorded independently | One row per user, select own-only; `meetups` row created by trigger only when both say yes |
| No service-role key in the frontend | Not needed for Milestone 1; `.gitignore` covers `.env*`; only `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` exist client-side |

**Moderation without surveillance (later phase):** a `moderator` role (via `app_metadata`) can read messages **only** for matches that have an open report, through `get_reported_conversation(report_id)`. Every call is written to a `moderation_access_log`. Nobody, including moderators, gets a general read policy on `messages`.

---

## 5. Server functions (RPCs)

| Function | Purpose |
| --- | --- |
| `complete_quest(payload jsonb)` | Validates and upserts profile, private, availability and progress; sets `quest_completed_at`. `university_id` comes from the auth email domain. |
| `request_match()` | See matching flow. Returns `{ status: 'matched', match_id }` or `{ status: 'waiting' }`. |
| `cancel_match_request()` | Leaves the pool. |
| `get_match_partner(match_id)` | Safe public fields of the other member. |
| `get_my_active_match()` | Restores state on sign-in or reload. |
| `block_match(match_id)` | Inserts block, sets status `blocked`, revokes the blocker's shares, cancels the meetup. |
| `unmatch(match_id)` | Sets status `unmatched`, cancels the meetup. |
| `share_contact(match_id, channel)` / `revoke_contact(...)` | Owner-only sharing. Email is read from `auth.users` inside the function. |
| `set_meetup_consent(match_id, event_id, status)` | Upserts own consent. A trigger creates or cancels `meetups`. |
| `get_meetup_status(match_id)` | Returns `none` / `waiting` (own interest only) / `unlocked`. Never reveals the partner's unilateral interest. |

## 6. Matching flow

1. Student finishes Level 5 → `complete_quest()` → client calls `request_match()`.
2. `request_match()` (security definer, single transaction):
   - `pg_advisory_xact_lock(hashtext(university_id))` so two simultaneous requests can't double-match.
   - Candidates: `match_requests.status = 'waiting'`, same university, quest completed, not self, no block in either direction, never matched before, no active match.
   - Score each candidate with `compatibility_score(a, b)`, a SQL port of `scoreCandidate` (interests 45%, style 30%, events 15%, preference 10%, mapped to 58–98).
   - Best candidate → insert `matches` (+ shared_interests, shared_event_ids, shared_style) and two `match_members` rows, and set both requests to `matched`.
   - No candidate → upsert own request as `waiting`.
3. **Waiting UX:** Quest Complete keeps its radar animation, then shows a "Waiting for your flock…" state. It subscribes to realtime inserts on `match_members` filtered `user_id=eq.<me>`, and when the other student arrives the reveal fires on both devices.
4. Reveal text: `buildReasons()` is extracted from the current `scoreCandidate` into a pure function over the match row (`shared_*` columns), so the "Why you matched" copy is unchanged.
5. Later: scheduled weekly "rounds" via `pg_cron` calling a batch version, with a minimum-score threshold.

Keep the TypeScript `scoreCandidate` for mock mode, and add a test that checks it against the SQL function on fixed fixtures so the two can't drift.

## 7. Realtime messaging

- **Messages:** `supabase.channel('room:<matchId>').on('postgres_changes', { event: 'INSERT', table: 'messages', filter: 'match_id=eq.<id>' })`. RLS is evaluated per subscriber.
- **Room state:** the same channel also listens to `UPDATE` on `matches` (status → blocked/unmatched closes the room live) and `INSERT` on `meetups` / `contact_shares` (Phase 6).
- **Send:** optimistic append with a client-generated uuid, then `insert`. The realtime echo is de-duplicated by id; a failure marks the bubble "not sent · retry".
- **Initial load:** last 50 messages ordered by `created_at`, with pagination later.
- **Typing indicator / online dot (Phase 7):** Realtime **Broadcast + Presence** on a *private* channel, authorised by an RLS policy on `realtime.messages` using `is_match_member`.
- **Publication:** a migration adds `messages`, `matches`, `match_members`, `meetups` and `contact_shares` to `supabase_realtime`.

---

## 8. Files that will change

**New**
```
.env.example                         VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_DATA_MODE
supabase/config.toml                 from `supabase init`
supabase/migrations/0001_catalogue_and_profiles.sql
supabase/migrations/0002_matching_and_messages.sql
supabase/migrations/0003_meetups_sharing_safety.sql
supabase/migrations/0004_rls_policies.sql
supabase/migrations/0005_functions_and_triggers.sql
supabase/migrations/0006_realtime_publication.sql
supabase/seed.sql                    universities + events (dev data)
supabase/tests/*.test.sql            pgTAP privacy tests (one per requirement)
src/config.ts                        data-mode flag
src/lib/supabase.ts                  createClient (anon key only)
src/types/database.ts                generated by `supabase gen types typescript`
src/services/api/auth.ts             sendCode, verifyCode, signOut, onAuthChange
src/services/api/profile.ts          completeQuest, loadMyProfile
src/services/api/catalogue.ts        universities, events
src/services/api/matching.ts         requestMatch, getActiveMatch, getPartner, onMatched
src/services/api/chat.ts             loadMessages, sendMessage, subscribeRoom
src/services/api/safety.ts           report, block, unmatch
src/services/api/meetup.ts           setConsent, getStatus          (Phase 6)
src/services/api/sharing.ts          share, revoke, keepChatting    (Phase 6)
src/state/AuthContext.tsx            session + bootstrap
src/state/useMatchRoom.ts            replaces useMockPeer in supabase mode, same { typing, send } shape
src/state/useCatalogue.ts            events/universities with static fallback
src/components/auth/EmailCodeField.tsx   OTP step used in Level 5
src/components/auth/SignInModal.tsx      returning users
```

**Modified**
| File | Change |
| --- | --- |
| `package.json` | `@supabase/supabase-js`; `supabase` CLI as dev dependency |
| `src/types/index.ts` | `MatchPartner` (public fields only) replaces `Student` in `MatchResult`; event `startsAt`; server ids |
| `src/state/gameLogic.ts` | New actions: `SESSION_HYDRATED`, `MATCH_LOADED`, `MESSAGE_ACKED`/`MESSAGE_FAILED`, `ROOM_STATUS_CHANGED`. Peer-simulation actions used only in mock mode. `deriveStage` unchanged. |
| `src/state/GameContext.tsx` | Hydrate from server when signed in; localStorage limited to the pre-signup draft |
| `src/services/storage.ts` | Draft-only persistence |
| `src/services/matchService.ts` | `MatchProvider` becomes `requestMatch(): matched \| waiting`; `buildReasons()` extracted; mock provider retained |
| `src/components/levels/ContactLevel.tsx` | Email → OTP verification; Instagram saved to `profile_private` |
| `src/components/levels/CampusLevel.tsx` | University list from DB; must match the verified email domain |
| `src/components/levels/MeetLevel.tsx` | Events from DB |
| `src/screens/WelcomeScreen.tsx` | "Sign in" link; presenter shortcut only in mock mode |
| `src/screens/QuestCompleteScreen.tsx` | `requestMatch()` + waiting state + realtime match notification |
| `src/screens/MatchRevealScreen.tsx` | Partner via `get_match_partner`; reasons via `buildReasons` |
| `src/screens/MatchRoomScreen.tsx` | `useMatchRoom`; "Undo (demo only)" hidden in supabase mode |
| `src/components/room/SafetyModals.tsx` | Calls report/block/unmatch RPCs |
| `src/components/room/MeetupPanel.tsx`, `ContactSharingPanel.tsx` | Call RPCs (Phase 6); show the partner's shares from `contact_shares` |
| `src/components/hud/PlayerHud.tsx` | "Replay demo" becomes "Sign out" in supabase mode |
| `src/data/students.ts`, `events.ts`, `campus.ts` | Mock-mode only / offline fallback |

**Unchanged:** `components/ui/*`, `VibeLevel`, `StyleLevel`, `LevelShell`, `EventCard`, `ChatThread`, `Composer`, `RoomHeader`, all styles, all static copy and question data.

---

## 9. Migration strategy

- **Schema as code:** Supabase CLI migrations in `supabase/migrations`, committed to Git. Never edit schema in the dashboard for anything that should persist.
- **Environments:** a `friendship-quest-dev` project now; a separate `-prod` project before real students. Optionally local Supabase via Docker for fast iteration (`supabase start`).
- **Order:** catalogue/profiles → matching/messages → meetups/sharing/safety → RLS → functions/triggers → realtime. RLS ships in the same release as its tables, never after them.
- **Tests before UI:** pgTAP tests (`supabase test db`) that sign in as user A, B and C and assert, for example:
  - C cannot select A and B's match or messages.
  - B cannot read A's `profile_private` or `meetup_consents`.
  - After a block, neither A nor B can insert messages.
  - B sees A's Instagram only after A calls `share_contact`.
  - `request_match` never pairs blocked users or users from different universities.
- **Types:** regenerate `src/types/database.ts` after every migration.
- **Data migration:** none is needed; the prototype has no real users. The localStorage draft is read once at signup and uploaded via `complete_quest`.
- **Rollout:** `VITE_DATA_MODE=mock` stays the default until Milestone 1 passes. Each phase merges into `real-backend` behind the flag, then into `main`.

## 10. Implementation phases

| Phase | Scope | Exit check |
| --- | --- | --- |
| 0. Setup | Supabase client, env, data-mode flag, CLI linked, types generated | Mock demo unchanged; app boots in both modes |
| 1. Schema + RLS | Migrations 0001–0006, seed, pgTAP privacy suite | All privacy tests green |
| 2. Auth | OTP in Level 5, domain-restriction hook, profile trigger, Sign in / Sign out, session restore | Non-university email rejected server-side; refresh keeps session |
| 3. Profile | `complete_quest`, catalogue from DB, XP/badges persisted | Profile visible in DB; partner-facing reads blocked by RLS |
| 4. Matching | `request_match`, waiting state, realtime notification, reveal from server data | Two browsers complete the quest and both see the reveal |
| 5. Realtime room | Load, send, subscribe; report / block / unmatch RPCs; room closes live on block | **Milestone 1:** two students chat in real time; a block stops messaging both ways |
| 6. Meetup + sharing | Consent RPCs + trigger, `meetups`; `share_contact` / revoke / keep chatting | Unlock only when both say yes; nothing is shared without the owner's action |
| 7. Hardening | Typing/presence (private channels), message rate limit trigger, moderator review function + access log, events admin, scheduled rounds, account deletion | Security review before inviting real students |

---

## 11. What you need to set up in Supabase

1. **Create the project(s):** a Supabase org plus a `friendship-quest-dev` project. Pick the region closest to your students (e.g. Canada Central). Save the database password in a password manager.
2. **Copy two values into `.env.local`** (git-ignored): the **Project URL** and the **anon / publishable key**. Do **not** copy the service-role / secret key anywhere in this project.
3. **Install and link the CLI:** `npm i -D supabase`, then `npx supabase login` and `npx supabase link --project-ref <ref>`. Install Docker Desktop only if you want local Supabase.
4. **Auth → Providers:** enable Email and turn off all other providers.
5. **Auth → Email:** set the OTP length and expiry (e.g. 6 digits, 10 min), and edit the "Magic Link" / "Confirm signup" templates to show the `{{ .Token }}` code.
6. **Auth → URL configuration:** Site URL `http://localhost:5173`, plus your eventual production URL in Redirect URLs.
7. **Custom SMTP:** required before real use. The built-in sender is heavily rate-limited and meant for testing. Use Resend, Postmark or SendGrid with a domain you control. **Check with university IT** that mail from it isn't filtered from student inboxes.
8. **Auth hook:** after Phase 2's migration, enable Auth → Hooks → *Before User Created* → `public.hook_restrict_university_email`.
9. **Real data:** the list of universities and their **exact email domains** (e.g. `ualberta.ca`), the FAC event list (dates, rooms, capacity), and who will act as moderators.
10. **Test accounts:** two real university inboxes for Milestone 1 testing. In dev only, you can add a test domain row to `universities` and remove it before prod.
11. **Governance:** a privacy notice, data-retention rules (how long messages and reports are kept), and any university approval needed before collecting student data.
