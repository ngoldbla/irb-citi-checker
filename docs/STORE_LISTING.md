# Chrome Web Store Listing Worksheet

> **For maintainers, not end users.** This is prep material for submitting
> **IRB CITI Checker** to the Chrome Web Store. Fill in the bracketed
> `[TODO: ...]` slots, then a maintainer with a Chrome Web Store developer
> account performs the actual upload and submission. Nothing here is published
> automatically.

- **Extension name:** IRB CITI Checker
- **Package name:** `irb-citi-checker`
- **Version:** 1.0.0
- **Manifest:** V3
- **License:** MIT © Dylan Goldblatt and contributors (2026)
- **Repository:** https://github.com/ngoldbla/irb-in-chrome
- **Category (suggested):** Workflow & Planning (or Developer Tools)
- **Language:** English (United States)

---

## 1. Store name

```
IRB CITI Checker
```

(Max 75 characters; this is well under the limit. Do not include version numbers
or marketing modifiers — store policy discourages keyword stuffing.)

---

## 2. Short description

> Max 132 characters. Shown in search results and listing header.

```
Verify CITI Human Subjects training compliance for personnel on Cayuse IRB submissions. Fully offline — no data leaves your browser.
```

(Character count: 130. Verify before pasting; trim if the store editor reports
an overflow.)

---

## 3. Detailed description

> Drawn from the README. Plain text / light formatting only — the store editor
> does not render Markdown. Paste as-is.

```
IRB CITI Checker helps IRB staff verify CITI Human Subjects training compliance
for the research personnel listed on a Cayuse submission — fully offline, with no
AI and no data leaving your browser.

The extension reads the personnel and CITI training records already shown on a
Cayuse submission, evaluates each person against a set of Human Subjects training
compliance rules, and — when there are gaps — drafts a ready-to-send notification
for the Principal Investigator. Everything runs locally in your browser.

WHY USE IT
Manually cross-checking every investigator's CITI training status on a Cayuse
submission is slow and error-prone. This extension does it in one click and
explains exactly what is missing for each person, so you can return a submission
with clear, specific guidance.

- Private by design. No network requests, no API keys, no telemetry. The
  extension only reads the page you are already looking at and stores its results
  locally in your browser.
- Works at any institution. Cayuse is a single vendor, so the extension supports
  every *.cayuse.com instance out of the box — no configuration needed.
- Instant, deterministic notifications. Deficiency messages are produced from an
  editable template, not a language model, so the output is consistent and
  reviewable.
- No accounts, no setup. Nothing to sign up for and no API keys to configure —
  just install and scan.

FEATURES
- One-click compliance scan of all listed study personnel on a Cayuse submission
  form.
- Per-person evaluation with plain-language deficiency descriptions and
  recommended actions (missing training, expired training, pending sync, and
  more).
- Automatic home-institution vs. external classification, auto-detected from the
  Cayuse web address, with a manual override in Settings.
- An editable, mail-merge notification template for the PI that pulls in the
  specific issues found. Copy it and paste it into Cayuse's "Missing information
  or materials" field or an email.
- A side panel that lives alongside Cayuse — no copying data between tabs.

HOW IT WORKS
- The content script reads personnel and CITI training data from the Cayuse page
  you are viewing.
- The service worker evaluates compliance, resolves your home institution, and
  renders the notification from your template.
- The side panel displays results and the editable draft.

No step contacts any external service. All processing happens on your device.

PRIVACY
The extension processes only the data already visible on your Cayuse submission
page, keeps it in your browser's local storage, and sends it nowhere.

Not affiliated with, endorsed by, or sponsored by Cayuse LLC or the CITI Program.
"Cayuse" and "CITI Program" are trademarks of their respective owners; they are
referenced here only to describe compatibility.
```

---

## 4. Single purpose statement

> Required by Chrome Web Store policy. One narrow, easily-understood purpose.

```
IRB CITI Checker has a single purpose: to read the personnel and CITI Human
Subjects training records already displayed on a Cayuse IRB submission page,
evaluate each person's training compliance locally, and draft a notification for
the Principal Investigator from an editable template. All processing happens on
the user's device; no data is transmitted.
```

---

## 5. Permission justifications

> The store review form asks you to justify each permission individually. Copy
> the matching cell. Every justification must make clear the permission does NOT
> enable data collection or transmission.

| Permission | Why it is requested | Data collection / transmission? |
|---|---|---|
| `sidePanel` | Hosts the extension's entire user interface in Chrome's side panel so results appear next to the Cayuse submission without switching tabs or copying data between windows. | None. The side panel renders locally-computed results. No data is collected or transmitted. |
| `storage` | Saves the user's settings (institution name, home email domains, notification template) and the most recent scan results using `chrome.storage.local`, so preferences persist between sessions. | None leaves the device. Data is written only to `chrome.storage.local` on the user's own machine and is never synced or transmitted. |
| `activeTab` | Lets the extension act on the Cayuse tab the user is currently viewing when they open the side panel and click Scan, scoping access to that one user-initiated tab. | None. It grants temporary access to the current tab only in response to a user action; nothing is sent anywhere. |
| `scripting` | Injects the content script that reads the personnel and CITI training records already rendered on the Cayuse page and opens/closes the training detail modals to read their contents. | None. The script reads page content already visible to the user and returns it to the local service worker; nothing is transmitted off-device. |
| `host_permissions: https://*.cayuse.com/*` | Cayuse is a single SaaS vendor and every institutional tenant is served under a `*.cayuse.com` subdomain. This one broad host pattern lets the extension work at any institution's Cayuse instance without per-tenant configuration or hardcoded domains. | None. The host match only allows the content script to run on Cayuse pages; the extension makes zero outbound network requests, so no data is collected or transmitted. |

**Broad host permission note (for the review form):** The single
`https://*.cayuse.com/*` pattern is intentional and minimal — it is the narrowest
pattern that still works for every institution, because all Cayuse tenants live
under `*.cayuse.com`. The extension does not request `<all_urls>` or any other
host. The home institution is auto-detected from the Cayuse subdomain at runtime;
no broader access is needed.

---

## 6. Data usage (for the Web Store data-safety disclosures)

Use these answers when filling out the **Privacy practices** / data-safety
section of the listing.

**Summary:** IRB CITI Checker does **not** collect, use, or transmit any user
data. All processing is local to the user's browser.

| Data-safety question | Answer |
|---|---|
| Does this item collect or use user data? | **No.** The extension reads data already displayed on the Cayuse page the user is viewing and processes it on-device only. |
| Is any user data transmitted off the device? | **No.** The extension makes zero network requests. There are no external services, APIs, or telemetry. |
| Is any user data sold to third parties? | **No.** |
| Is any user data used for purposes unrelated to the single purpose? | **No.** |
| Is any user data used for creditworthiness or lending? | **No.** |
| Where is data stored? | Locally, in `chrome.storage.local`. It is never synced, exported, or transmitted. |
| What is stored? | User settings (institution name, home email domains, notification template) and the most recent scan results — all on the user's device. |

**Certifications to check on the form:**

- [x] I do not sell or transfer user data to third parties, outside of approved
      use cases.
- [x] I do not use or transfer user data for purposes unrelated to my item's
      single purpose.
- [x] I do not use or transfer user data to determine creditworthiness or for
      lending purposes.

**History note (only if reviewer asks):** Earlier development builds used a
remote language-model service to draft notifications. That capability was
**removed**; the current extension is fully offline and deterministic. Do not
describe any remote/LLM behavior as current.

---

## 7. Privacy policy URL

The Chrome Web Store requires a privacy policy URL even when no data is collected.

```
https://gist.github.com/ngoldbla/799588d7e10c64dd0e42e84050234523
```

The privacy policy is hosted as a **public GitHub Gist** so the source repository
can remain private. Verified publicly resolvable (HTTP 200, logged-out) on
2026-06-04. The Gist content is the softened `PRIVACY.md` (no open-source / repo
references; contact points to the Web Store developer contact).

---

## 8. Screenshots & assets checklist

Store requires at least 1 screenshot (up to 5). Recommended: 1280×800 or 640×400
PNG/JPEG. Capture on a Cayuse submission page (sanitize/redact any real personnel
PII — use a test or fictitious submission).

- [x] **Store icon — 128×128 PNG.** In repo at `src/assets/icon-128.png` (also
      `icon-16.png`, `icon-48.png`); copied to `dist/assets/` on build.
- [ ] **Screenshot 1 — Side panel with scan results** showing per-person
      compliance status (compliant + deficient examples). Redact real names/emails.
- [ ] **Screenshot 2 — A drafted PI notification** rendered from the template,
      with merge fields filled in.
- [ ] **Screenshot 3 — Settings panel** (institution name, home email domains,
      editable notification template).
- [ ] **Screenshot 4 (optional) — Scan in progress** (progress bar / per-person
      progress).
- [ ] **Screenshot 5 (optional) — Empty/start state** of the side panel on a
      Cayuse page.
- [ ] **Small promo tile — 440×280 PNG** (optional but recommended for better
      placement).
- [ ] **Marquee promo tile — 1400×560 PNG** (optional).
- [ ] Confirm every screenshot uses **fictitious or fully redacted** data — no
      real researcher PII.

---

## 9. Submission steps

> Performed by a maintainer with a Chrome Web Store developer account.

1. **Register a developer account.** Go to the
   [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   and pay the **one-time $5 USD registration fee** (per Google account). Complete
   the account/identity verification Google requires.
2. **Build the upload package.** From the repo root run:
   ```bash
   npm run package
   ```
   This runs the build and produces `releases/irb-citi-checker-v1.0.0.zip`, with
   `manifest.json` at the archive root (the format the store expects).
3. **Create a new item.** In the dashboard, click **Add new item** and upload the
   zip from step 2.
4. **Fill in the listing.** Paste the store name (§1), short description (§2),
   detailed description (§3), single purpose (§4), and upload the icon and
   screenshots (§8). Set category and language.
5. **Complete the privacy practices form.** Enter the permission justifications
   (§5), answer the data-safety questions and check the certifications (§6), and
   paste the privacy policy URL (§7).
6. **Submit for review.** Save the draft, then click **Submit for review**.
   Review typically takes from a few hours to several days. Watch the registered
   email for approval or change-requests from the review team.
7. **After approval.** Update README Install **Option A** with the published
   listing link, and tag the corresponding release.

---

## 10. Pre-submission checklist

- [ ] `npm run build` and `npm test` pass on the release commit.
- [ ] `manifest.json` `version` matches `package.json` `version` (kept in sync by
      `scripts/sync-version.mjs` on build).
- [ ] Package zip generated via `npm run package`.
- [x] Permissions in `manifest.json` match the justifications in §5 (currently
      `sidePanel`, `storage`, `activeTab`, `scripting`, host `https://*.cayuse.com/*`).
- [x] `PRIVACY.md` committed at repo root (public URL resolves once the repo is
      made public — see §7).
- [ ] Screenshots captured with redacted/fictitious data (§8).
- [ ] Single purpose statement and data-safety answers reflect the **offline,
      no-data-transmitted** architecture (no mention of AI/LLM/remote services as
      current).
```
