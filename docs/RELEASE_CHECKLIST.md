# Release checklist

## Decisions FAC needs to make

None of these are invented or assumed by the code. The Privacy Policy describes only what the software does.

| # | Decision | Where it shows up |
| --- | --- | --- |
| 1 | **Who is responsible?** The person or body accountable for the data, and the privacy contact address. | Privacy Policy, `VITE_PRIVACY_CONTACT_EMAIL` |
| 2 | **University and legal requirements.** Whether FAC must follow University of Alberta privacy or IT policy, Alberta privacy law, or student-group rules, and whether Google Sheets (possibly storing data outside Canada) is acceptable. Ask the University's privacy office. No compliance claim is made. | Privacy Policy |
| 3 | **Retention.** How long registrations, suggestions and match records are kept, and what happens to unmatched students. The policy currently says no period has been set. | Privacy Policy |
| 4 | **Administrators.** Who has access, how it's approved and removed, and whether they use 2-step verification. | Sheet sharing |
| 5 | **Eligibility.** Minimum age (some first-year students are under 18), alumni, staff, Open Studies, exchange students. Enrolment is self-declared, not verified. | Level 1, Privacy Policy |
| 6 | **Consent before introductions.** The exact steps and wording for asking both students before sharing anything, including Instagram. | Match Management, emails |
| 7 | **Safety.** How a student reports a problem with a match, who responds, and how quickly. The site promises no supervised meetings. | Guidelines |
| 8 | **Commercial email rules.** Whether match emails need sender identification and an opt-out. | Email templates |
| 9 | **University disclaimer.** The footer says the site isn't operated or endorsed by the University of Alberta. Confirm that's accurate. | Footer, Privacy Policy |
| 10 | **Speed Dating teaser.** Confirm FAC is comfortable showing it beside a platonic friendship service. | Landing page |

When a decision changes the policy or consent wording, update `src/pages/PrivacyPage.tsx` and bump `PRIVACY_POLICY_VERSION` in `src/config.ts`.

## Before launch

**Backend**
- [ ] Spreadsheet owned by a lasting FAC account, sharing **Restricted**, administrators listed by name
- [ ] 2-step verification on the owner account
- [ ] `setupSpreadsheet` run; four tabs present; Dashboard shows no formula errors
- [ ] Web app deployed: Execute as **Me**, access **Anyone**, URL ends in `/exec`
- [ ] `/exec` in a private window shows only the service message

**Site**
- [ ] Three repository variables set; Pages source is GitHub Actions
- [ ] Workflow green; `check:release` reports nothing blocking
- [ ] Footer shows the right contact; Privacy Policy shows the right privacy contact

**Verified on the live site** ([steps](DEPLOYMENT.md#4-test-a-real-submission))
- [ ] Real registration appears in the sheet; refresh adds no row
- [ ] Offline failure keeps answers; retry adds exactly one row
- [ ] Anonymous suggestion appears
- [ ] Formula text stays text
- [ ] iPhone Safari, Android Chrome, desktop Firefox
- [ ] One pass with a screen reader (VoiceOver, TalkBack or NVDA)
- [ ] Test rows deleted

**People**
- [ ] Decisions 1 to 7 made; Privacy Policy reviewed by someone at FAC with authority
- [ ] Administrators briefed: no exports to personal devices, no forwarding, how to delete a row on request
- [ ] Someone checks the privacy inbox and the sheet regularly

## After launch
- [ ] Watch **Apps Script → Executions** for failures in the first days
- [ ] To pause: Script Property `ACCEPTING_SUBMISSIONS` = `false`
