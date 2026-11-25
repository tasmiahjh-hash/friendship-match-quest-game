# Google Sheets backend

Website (GitHub Pages) → Apps Script web app (`Code.gs`) → private Google Spreadsheet.

Setup takes about 15 minutes. Do it from a Google account that FAC will keep: whoever deploys the script owns it, and submissions stop if that account is closed.

> **University accounts:** some Google Workspace organizations don't allow web apps open to "Anyone". If you don't see **Anyone** in step 3, use a non-Workspace Google account owned by FAC.

## 1. Create the private spreadsheet

1. Go to <https://sheets.new> and name it, e.g. `Friendship Quest (PRIVATE)`.
2. **File → Settings**: set Locale to **Canada** (or United States) and Time zone to **Edmonton**. The dashboard formulas assume comma separators.
3. **Share → General access** must be **Restricted**. Add only authorized administrators by name. In the share dialog's settings, turn off "Editors can change permissions and share".
4. Copy the spreadsheet ID from the address bar: `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`.

## 2. Add the script and create the tabs

1. In the spreadsheet: **Extensions → Apps Script**. Name the project `Friendship Quest endpoint`.
2. Replace everything in `Code.gs` with [Code.gs](Code.gs) from this folder.
3. **Project Settings (gear)** → tick **Show "appsscript.json" manifest file in editor**. Open `appsscript.json` in the editor and replace it with [appsscript.json](appsscript.json).
4. **Project Settings → Script Properties → Add script property**: name `SPREADSHEET_ID`, value from step 1.4. Save.
5. Back in the editor, choose `setupSpreadsheet` in the function list and press **Run**. Approve the permissions (it's your own script, so Google shows an "unverified app" notice: **Advanced → Go to project**).
6. The spreadsheet now has **Student Responses**, **Website Suggestions**, **Match Management** and **Dashboard**. Delete the empty `Sheet1`.

Reload the spreadsheet to see a **Friendship Quest** menu: *Set up / repair sheets* (safe to run again, never deletes student rows) and *Add a match row*.

## 3. Deploy the web app

1. **Deploy → New deployment → gear → Web app**.
2. **Execute as: Me**. **Who has access: Anyone** (not "Anyone with a Google account").
3. **Deploy**, then copy the **Web app URL**. It ends in `/exec`. This is `VITE_SUBMISSION_ENDPOINT`.

"Anyone" lets anyone *call* the endpoint. It doesn't share the spreadsheet, and the endpoint has no way to read rows back.

**Check it:** open the URL in a private window. You should see `{"ok":true,"service":"friendship-quest","accepting":true}` (or `false` while closed). A sign-in page means access isn't set to Anyone.

### Updating the script later

Saving isn't enough. **Deploy → Manage deployments → pencil → Version: New version → Deploy.** This keeps the same URL. "New deployment" would create a different URL.

## 4. Test a real submission before connecting the website

PowerShell. Synthetic data only; delete the rows afterwards.

```powershell
$url = 'PASTE_THE_EXEC_URL'
$body = @{ kind = 'feedback'; payload = @{
  schemaVersion = 1; submissionKey = [guid]::NewGuid().ToString()
  email = ''; category = 'other'; suggestion = '=1+1 synthetic test, please delete'; trap = '' } } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri $url -Method Post -ContentType 'text/plain;charset=utf-8' -Body $body
```

Expect `ok : True` and a `suggestionId` starting with `FB-`. In **Website Suggestions** the cell must show the text `=1+1 synthetic test…`, not a calculated result or an error.

This shows the script works. It doesn't show that a browser can read the reply: for that, follow [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md#4-test-a-real-submission).

## Settings

Script Properties, read on every request (no redeploy needed):

| Property | Default | Meaning |
| --- | --- | --- |
| `SPREADSHEET_ID` | required | The private spreadsheet |
| `ACCEPTING_SUBMISSIONS` | `true` | `false` closes submissions to the public; the site tells students. `true` opens them |
| `TEST_EMAILS` | empty | Comma-separated addresses that can still submit while closed, for controlled tests. Pick one nobody could guess; empty it afterwards |
| `MAX_PER_MINUTE` | 30 | Submissions accepted per minute, all visitors together. Raise it before a class or event signs up at once |
| `MAX_PER_DAY` | 1500 | Approximate daily ceiling |
| `MAX_PER_EMAIL` | 3 | Per email address, per 6 hours |

## Spreadsheet columns

**Student Responses.** You can reorder columns or add your own; don't rename or delete these.

| Column | From |
| --- | --- |
| Registration ID, Submitted At, Matching Status | Server. Status starts as `Pending` |
| First Name, Email, Avatar, Instagram, Student Self-Attestation, Guidelines Agreed | Level 1, Your Card |
| University, Campus, Campus ID, Program, Year of Study, Courses | Level 2, Campus Life |
| Friday Night, Planning Style, Texting Style, Group Size, Friendship Values | Level 3, Friendship Style (one column per question) |
| Interests | Level 4, Your Vibe |
| Meeting Comfort, Campus Match Preference, Activities Enjoyed, Availability | Level 5, Meeting Up |
| Consent Given, Privacy Policy Version | Review step |
| Possible Duplicate Of | Server. The first registration with the same email, for you to check |
| Schema Version, Submission Key, Answers Hash, Answers JSON | Server. Keys prevent double submission; the JSON is the complete record |

**Website Suggestions:** Suggestion ID, Timestamp, Email, Category, Suggestion, Review Status (`New`), plus a key and hash.

**Match Management:** Match ID, both Registration IDs, Match Status, each student's consent, Notification Status, Date Matched, Administrator Notes. Filled in by administrators; the website never touches it. "Completed matches" on the dashboard counts `Confirmed`.

**Dashboard:** totals, possible duplicates, students awaiting matching (Pending and not flagged as duplicates), completed matches, suggestions, registrations by campus and per day.

## Changing the questionnaire

Labels and allowed answers live in `src/data/*.ts` **and** in `CATALOG` in `Code.gs`. `npm test` fails if they differ. Change both, bump `SCHEMA_VERSION` in both if fields change, redeploy the script as a new version, then deploy the site.

## How the request works, and why

- Apps Script can't answer a CORS preflight, so the site sends JSON as `text/plain` with no custom headers. Browsers treat that as a simple request and skip the preflight.
- Apps Script replies with a 302 to `script.googleusercontent.com`, which sends `Access-Control-Allow-Origin: *`. The browser follows it and the site reads the JSON. `no-cors` is never used, so "success" always means a parsed, verified reply.
- The script saves under a lock, reads the row's ID back, and only then replies. The site also checks that the reply echoes its own submission key.
- If the reply is lost, the student can retry: the same key returns the same reference ID and adds no row.

## Known limits

- Apps Script hides visitors' IP addresses, so rate limits are global and per email. They slow abuse; they don't stop a determined attacker. If it happens, set `ACCEPTING_SUBMISSIONS` to `false` first.
- Emails aren't verified, so someone could register an address that isn't theirs. Reply-confirm before sharing anything about a match.
- Text starting with `=`, `+`, `-`, `@` and similar is stored as plain text. Sheets can drop the protective apostrophe when exporting to CSV, so don't open CSV exports in Excel without importing columns as Text.
- A duplicate email is kept and flagged, not refused: refusing would let anyone test whether a person had registered.
- Anyone with edit access to the spreadsheet can also open the bound script. Keep that list short.
