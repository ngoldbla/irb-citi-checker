# Deployment Example — Adopting the Extension at One Institution

> **This is a fictional, illustrative walkthrough.** "Example University" is not a
> real institution, and `example-irb.cayuse.com`, `example.edu`, and
> `students.example.edu` are placeholders. Swap in your own values wherever you
> see them.

The governance documents in [`../governance/`](../governance/) are written to be
**institution-neutral** so the extension can be adopted anywhere. That keeps them
reusable, but it also means they say "consult your institution's policy" rather
than naming a specific office, domain, or retention rule. This document fills that
gap with a single, end-to-end worked example so you can see what a real adoption
looks like and use it as a template for your own.

**Key fact up front:** the base extension needs **no code changes** to run at your
institution. Cayuse is a single SaaS vendor, and every customer tenant lives under
`*.cayuse.com`. The extension ships with one broad host permission
(`*://*.cayuse.com/*`) and **auto-detects** your home institution from the Cayuse
subdomain. Everything below is configuration, policy mapping, and rollout — not
forking or recompiling.

---

## The example institution

| Attribute | Example value | Where it shows up |
|---|---|---|
| Institution name | **Example University** | Settings (optional override), notification template `{{institutionName}}` |
| Cayuse Human Ethics host | `example-irb.cayuse.com` | The page staff scan; source of auto-detection |
| Auto-detected token | `example` (from the `example-irb` subdomain) | Internal home-vs-external classification |
| Home email domains | `example.edu`, `students.example.edu` | Optional Settings override; home-vs-external classification |
| IRB / Research Compliance office | "Example University IRB Office" | Who deploys and uses the extension |

With this setup, **no configuration is strictly required**: visiting a submission
on `example-irb.cayuse.com` auto-resolves the home institution to "Example" and
classifies personnel whose email or listed institution contains "example" as
internal. The optional override (below) makes the display name nicer and the
matching more precise.

---

## 1. Install path for staff

Pick **one** distribution method for your office and document it in your internal
runbook so every analyst installs the same build.

### Option A — Release zip (no developer account needed)

Best when you want full control over the build your staff run and don't want to
wait on Web Store review.

1. A designated maintainer downloads the latest
   `irb-citi-checker-vX.Y.Z.zip` from the project
   [Releases page](https://github.com/ngoldbla/irb-in-chrome/releases) (or builds
   it from source with `npm run build` and `npm run package`).
2. The maintainer verifies the build (see the rollout checklist in §4) and
   distributes the zip to staff through an internal, access-controlled channel
   (e.g. a shared drive folder limited to IRB staff).
3. Each analyst unzips it to a **permanent** folder (not Downloads — Chrome loads
   the extension from that path on every launch).
4. Analyst opens `chrome://extensions`, enables **Developer mode** (top-right
   toggle), clicks **Load unpacked**, and selects the unzipped folder.
5. To update later: replace the folder contents with the new build and click the
   **refresh** icon on the extension card.

### Option B — Chrome Web Store

Best for the lowest-friction install once a listing exists. If your institution
prefers managed deployment, your Chrome Enterprise admins can **force-install** a
Web Store extension by ID through Google Admin console policy, so analysts get it
automatically with no manual steps.

> The public Web Store listing is in preparation. Until it is published, use
> Option A. When it is available, a one-click install link will appear in the
> project README.

Either way, the extension is the **same base build for every institution** — there
is no "Example University edition."

---

## 2. Optional Settings configuration

Open the side panel and click the gear (**Settings**) icon. Two settings matter
for institution adoption:

| Setting | Field | Example value |
|---|---|---|
| Institution name | `institutionName` (blank = auto-detect) | `Example University` |
| Home email domains | `institutionEmailDomains` (list) | `example.edu`, `students.example.edu` |

Leaving both blank is fully supported: the extension auto-detects from the Cayuse
subdomain (`example-irb.cayuse.com` → "Example") and classifies anyone whose email
domain or listed institution contains the token `example` as home-institution
personnel.

### When you can rely on auto-detection

You probably **don't need the override** if all of these hold:

- Your Cayuse subdomain clearly contains your institution's short name
  (e.g. `example-irb`, `example.cayuse.com`).
- Your internal personnel use email domains that contain that same token
  (e.g. `@example.edu`).
- You're comfortable with the auto-derived display name in notifications
  (e.g. "Example") — or you'll edit the template to spell out the full name.

### When you should set the override

Configure the override (institution name + home email domains) if **any** of these
apply:

- **The display name matters.** Auto-detection yields a single capitalized token
  ("Example"), but you want "Example University" to appear in the
  `{{institutionName}}` field of PI notifications.
- **Your email domains don't match the subdomain.** For instance, the tenant is
  `eu-irb.cayuse.com` but staff use `@example.edu` — the token "eu" won't match
  "example.edu," so set the home domains explicitly.
- **You have multiple legitimate home domains** (faculty `example.edu` plus
  students `students.example.edu`). List them all so students aren't misclassified
  as external collaborators.
- **The heuristic is too loose or too strict** for your tenant — e.g. a common
  token causes external collaborators to be matched as internal, or an unusual
  subdomain causes internal staff to be flagged external. The explicit home-domain
  list switches matching to exact-domain comparison, which is more precise.

When you set home email domains, classification prefers **exact domain matching**
over the looser subdomain-token substring match, so the override both improves the
display name and tightens who counts as "internal."

### Notification template

Settings also lets you customize the **PI notification template**. It is a plain,
deterministic mail-merge string — **no AI/LLM is involved** (earlier versions used
a hosted model; that has been removed, and the extension now makes **zero network
requests**). The available merge fields are:

`{{piName}}` · `{{protocolNumber}}` · `{{submissionTitle}}` · `{{institutionName}}`
· `{{date}}` · `{{deficiencies}}`

Edit the wording to match your office's voice, signature block, and instructions,
then save. Staff copy the rendered text and paste it into Cayuse's "Missing
information or materials" field (or an email) themselves — the extension does
**not** click through Cayuse's return-to-PI flow (that browser automation is an
intentional, documented stub in `src/content/cayuse-navigator.ts`).

---

## 3. Mapping your institution's policies onto the tool

The extension is a local utility: it reads data already visible on a Cayuse
submission you have permission to view, evaluates it against CITI training rules,
and renders a notification draft. All data stays in `chrome.storage.local` and is
**never transmitted**. That keeps the privacy footprint small, but you still own
the decision of how the tool fits your institution's policies.

> **No specific law is asserted here.** Records-retention periods, public-records
> obligations, and privacy-review thresholds vary by jurisdiction and institution.
> For every item below, **consult your institution's policies and your privacy /
> records / IT-security offices** to determine the governing rule. The goal is to
> map an existing policy onto the tool, not to invent one.

### 3.1 Data governance

- **What it handles:** personnel names, emails, roles, listed institution, and
  CITI training course/date records scraped from the submission, plus the
  extension's computed compliance status and notification text. The
  [Data Governance](../governance/02-data-governance.md) doc has the full
  inventory and classification.
- **Map your policy:** decide which of these elements your institution classifies
  as PII or otherwise sensitive, and apply your existing data-handling standard to
  the device and browser profile where the extension runs (managed device,
  full-disk encryption, screen-lock, etc.). The data lives unencrypted in the
  browser's local store, so device-level controls are the relevant safeguard.

### 3.2 Records retention

- **What the tool does:** keeps the most recent scan and a per-submission history
  in local storage until cleared via the extension or `chrome://extensions`.
- **Map your policy:** determine, with your records office, whether anything the
  extension stores constitutes a record under **your institution's records-
  retention schedule and applicable public-records and records-retention laws**.
  If a compliance review or PI notification is itself a record, the **authoritative
  copy lives in Cayuse and your IRB's system of record** — the extension's local
  cache is a transient working copy. Document a routine for analysts to clear local
  data (e.g. at the end of a review cycle) consistent with that determination.

### 3.3 Acceptable use

- **Map your policy:** state in your internal SOP that the extension is to be used
  only by authorized IRB staff, only on submissions they are entitled to review,
  and only on institution-managed or otherwise approved browsers. Because the
  extension surfaces no data the analyst couldn't already read on the page, this is
  primarily an alignment exercise with your existing acceptable-use and least-
  privilege policies — not a new data-access grant.

### 3.4 Privacy review

- **Map your policy:** route the adoption through whatever **privacy / DPIA / IT-
  security review** your institution requires for staff tools that process
  personnel data. The [Privacy & Compliance](../governance/03-privacy-compliance.md)
  governance doc is written to support that review. The strongest facts to bring to
  your privacy office: the extension is **fully offline** (no network calls, no
  third-party services, no telemetry, no AI/LLM), open source under MIT (auditable),
  and stores data **only** in the local browser profile.

---

## 4. Internal rollout checklist

A suggested phased rollout for the Example University IRB Office. Adapt the scale
to your team.

### Phase 0 — Prepare

- [ ] Designate a maintainer/owner for the extension within the office.
- [ ] Choose a distribution method (§1, Option A or B) and document it.
- [ ] Complete any required privacy / security review (§3.4) **before** wider use.
- [ ] Fill in the contacts table in
      [`../governance/README.md`](../governance/README.md) (maintainer, IRB liaison,
      IT-security liaison, privacy officer).

### Phase 1 — Pilot with a few analysts

- [ ] Install the chosen build for 2–3 volunteer analysts.
- [ ] Have them run scans against **your own Cayuse instance**
      (`example-irb.cayuse.com`) on **real but already-reviewed** submissions, so
      results can be checked against a known-correct answer.
- [ ] Confirm home-vs-external classification is correct for a mix of faculty,
      student, and external-collaborator personnel — adjust the Settings override
      (§2) if anyone is misclassified.
- [ ] Collect feedback on the notification wording.

### Phase 2 — Verify scraping against your Cayuse instance

- [ ] Confirm the scan finds **all** listed personnel on representative
      submissions (not just the PI).
- [ ] Confirm CITI training records open and read correctly (the scraper opens
      training modals as it goes).
- [ ] Test edge cases: personnel with no training, expired training, pending
      sync, and external collaborators.
- [ ] If your Cayuse tenant's UI differs and scraping misses data, note it for the
      maintainer — Cayuse DOM changes are handled per
      [Operations §4](../governance/05-operations.md) and the runbook, **without**
      per-institution forking of the codebase.

### Phase 3 — Document your notification template

- [ ] Edit the template in Settings to match your office's voice, signature, and
      standard instructions to PIs.
- [ ] Confirm every merge field renders correctly on a real scan:
      `{{piName}}`, `{{protocolNumber}}`, `{{submissionTitle}}`,
      `{{institutionName}}`, `{{date}}`, `{{deficiencies}}`.
- [ ] Save the finalized template wording in your internal SOP so all analysts
      use the same approved language. (Settings are per-browser-profile, so the SOP
      is how you keep templates consistent across the team.)
- [ ] Define the manual copy-paste step: where in Cayuse (or which email) staff
      paste the rendered notification, since the extension does not automate the
      return-to-PI action.

### Phase 4 — Roll out to the office

- [ ] Roll the install out to all IRB analysts using the documented method.
- [ ] Record the version deployed (`manifest.json` / `package.json`) and your
      update procedure.
- [ ] Schedule a periodic re-check that scraping still works after Cayuse updates.

---

## What stays the same everywhere

To be explicit, adopting at Example University — or any institution — required:

- **Zero code changes.** Same MIT-licensed base build, same single
  `*://*.cayuse.com/*` host permission.
- **No new network access.** The extension makes no requests of any kind; there is
  nothing to allowlist on your firewall.
- **No vendor onboarding or API keys.** There is no AI/LLM, no external API, and no
  account to provision.

The only per-institution work is **configuration** (optional Settings override),
**policy mapping** (§3), and **rollout** (§4) — exactly the institution-specific
detail the neutral governance docs defer to this example for.
