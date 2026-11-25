# Deploying Friendship Quest

Expected address: <https://tasmiahjh-hash.github.io/friendship-match-quest-game/>

## 1. Backend

Follow [integrations/google-sheets/README.md](../integrations/google-sheets/README.md), steps 1 to 4. You'll end up with a URL ending in `/exec`.

## 2. Connect it locally

```bash
npm ci --ignore-scripts
cp .env.example .env.local      # PowerShell: Copy-Item .env.example .env.local
```

Put your real values in `.env.local` (Git ignores it), then run `npm run dev` and open <http://localhost:5173>. Placeholder values count as "not configured", and the site then says registration isn't open yet.

To try everything without Google, run `npm run dev:backend` in a second terminal and set `VITE_SUBMISSION_ENDPOINT=http://localhost:8787/exec`. It's the real `Code.gs` on an in-memory spreadsheet; nothing is kept.

## 3. Deploy to GitHub Pages

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.** (Pages on a private repository needs a paid plan.)
2. **Settings → Secrets and variables → Actions → Variables → New repository variable.** They're public values, so use Variables, not Secrets:

   | Variable | Value |
   | --- | --- |
   | `VITE_SUBMISSION_ENDPOINT` | the `/exec` URL |
   | `VITE_CONTACT_EMAIL` | FAC contact address |
   | `VITE_PRIVACY_CONTACT_EMAIL` | FAC privacy contact address |

3. Push to `main`. The workflow in `.github/workflows/deploy.yml` typechecks, tests, builds, runs the release check and publishes. **Every push to `main` goes live.**
4. If you change a variable later, run the workflow again (**Actions → Test and deploy → Run workflow**). Values are fixed at build time.

The workflow stops if the endpoint is set without a privacy contact, or if the build contains something that looks like a secret.

**Renamed the repository or added a custom domain?** The workflow picks the path up from Pages automatically. For local builds change `DEFAULT_BASE` in `vite.config.ts` and the fallback link in `public/404.html`.

## 4. Test a real submission

Do this on the published site, with synthetic answers and an inbox you control.

1. Open the site in a private window with the browser's developer tools on the **Network** tab.
2. Play the whole quest. Use `=1+1` as the program. Choose Augustana. Submit.
3. You should see **Quest Complete** with an `FQ-` reference. In Network, the `exec` request is a 302 followed by a readable 200, with no `OPTIONS` request and no CORS error.
4. In the spreadsheet: one new row, same ID, status `Pending`, campus ID `ualberta-augustana`, program shown as the text `=1+1`, JSON filled in. The Dashboard totals went up.
5. Refresh the page. The same reference shows, and no second row appears.
6. **Failure:** set Network to *Offline* before submitting another registration. The site must say it wasn't confirmed and keep the answers. Go back online and press **Try again**: one row only.
7. Send a suggestion with no email. Check **Website Suggestions**.
8. In a private window, open the `/exec` URL with `?action=list` added. Only `{"ok":true,"service":"friendship-quest","accepting":…}` may appear.
9. Open the spreadsheet link in a private window. Google must ask you to sign in.
10. Repeat steps 1 to 3 on an iPhone (Safari) and an Android phone.
11. Delete the test rows.

## 5. Open and close registration

In Apps Script, **Project Settings → Script Properties**: set `ACCEPTING_SUBMISSIONS` to `true` to open or `false` to close. It takes effect on the next request, with no redeploy. The site shows "Registration isn't open yet" while closed. `TEST_EMAILS` lists addresses that can still submit while closed.

## Troubleshooting

| What you see | Likely cause |
| --- | --- |
| "Registration isn't open yet" | `ACCEPTING_SUBMISSIONS` is `false`, the variable is missing or still a placeholder, or the workflow hasn't run since you set it |
| "We couldn't reach the server" + CORS error in the console | Web app access isn't **Anyone**, the URL ends in `/dev`, or the script wasn't redeployed as a new version |
| "Something went wrong on our side" | Check **Apps Script → Executions**. Usually `SPREADSHEET_ID` is missing or a column was renamed |
| "Something you entered wasn't accepted" on valid answers | The site and `Code.gs` are different versions. Redeploy the script |
| Blank page, 404 on assets | Wrong base path; check the Pages address against the build log's "Asset base path" |
