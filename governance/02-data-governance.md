# Data Governance

**Last Reviewed:** 2026-06-04

> **Scope note.** The IRB CITI Checker is a fully offline Chrome extension. It
> makes **zero network requests**, contains **no AI/LLM and no API keys**, and
> stores all data **only** in `chrome.storage.local` on the reviewer's own
> machine. Nothing this extension touches is ever transmitted off the device.
> For a concrete, institution-specific deployment walkthrough, see
> [`docs/DEPLOYMENT_EXAMPLE.md`](../docs/DEPLOYMENT_EXAMPLE.md). Examples below
> use generic placeholders (`jsmith@example.edu`, "Example University").

## 1. Data Inventory

### 1.1 Data Collected (Scraped from Cayuse DOM)

| Data Element | Source Location | Example | Classification |
|---|---|---|---|
| Personnel name | `td.e3-table-row-cell` cells[0] | "Jane Smith" | **PII** |
| Personnel role | CSS class on `[class*="assignment-type-"]` container | "Principal Investigator" | Non-sensitive |
| Personnel email | `td.e3-table-row-cell` cells[4] | "jsmith@example.edu" | **PII** |
| Personnel institution | `td.e3-table-row-cell` cells[1] | "Example University" | Non-sensitive |
| Training course name | Training modal `td.e3-table-row-cell` cells[0] | "Human Subjects Research (HSR)" | Non-sensitive |
| Training completion date | Training modal cells[4] | "2024-06-15" | Non-sensitive |
| Training expiration date | Training modal cells[5] or calculated (+3 years) | "2027-06-15" | Non-sensitive |
| Training registered email | Training modal cells (dormant — see note) | "jsmith@personal.example.com" | **PII** |
| PDF attachment status | Training modal (boolean, dormant — see note) | `true` / `false` | Non-sensitive |
| Submission title | Page heading / header bar | "PLOT Study - Initial" | Institutional |
| Protocol number | Header bar or heading matching `/IRB-FY\d+-\d+/` | "IRB-FY25-611" | Institutional |
| Page URL | `window.location.href` | Full Cayuse URL | Institutional |

> **Dormant fields.** `registeredEmail` and `hasPdfAttachment` are part of the
> data model but are **not currently populated** from the Cayuse training modal
> (the scraper sets them to `undefined` / `false`). The compliance rules that
> consume them (external-PDF, email-mismatch) are intentionally retained for
> future data sources. In normal operation today, no training-registered email
> is collected. See [`01-architecture.md`](01-architecture.md) and the TODO
> block in `src/lib/citi-evaluator.ts`.

### 1.2 Data Derived (Computed by Extension)

| Data Element | Derivation | Classification |
|---|---|---|
| `isHomeInstitution` | Person's email domain or free-text institution matches the resolved home institution (auto-detected from the Cayuse subdomain, or a manual Settings override). See §1.4. | Non-sensitive |
| `institutionName` | Resolved home-institution display name at scan time (auto-detected or configured override) | Institutional |
| Compliance status | Rule-based evaluation engine in `citi-evaluator.ts` | Non-sensitive |
| Deficiency descriptions | Generated text from rule evaluation; includes person's name | Contains **PII** |
| Deficiency recommendations | Generated text from rule evaluation; includes person's name | Contains **PII** |
| PI notification text | Rendered locally by `notification-renderer.ts` from a deterministic, editable template merged with deficiency data. No model, no network. | Contains **PII** |

### 1.3 Data NOT Collected

- Passwords, session tokens, or authentication credentials for Cayuse
- Browser history or activity outside Cayuse pages (`*://*.cayuse.com/*`)
- Keystroke data, mouse movements, or interaction patterns
- Contents of other browser tabs
- Student academic records (the extension operates on researcher/personnel data)
- IRB submission content beyond personnel and training sections

### 1.4 Home-Institution Resolution (Institution-Neutral by Design)

The compliance rules need to know whether a person belongs to the **home
institution** (the one running this Cayuse instance) or is an **external
collaborator**, because the required remediation differs. The extension does
**not** hardcode any single university. It resolves the home institution from
two sources, in priority order (`src/lib/institution.ts`):

1. **Manual override (authoritative when present).** In Settings, staff may set
   an institution display name and/or a list of home email domains
   (e.g. `example.edu`). When configured, home/external classification prefers
   exact email-domain matching against these domains.
2. **Auto-detection from the Cayuse subdomain.** When no override is set, the
   extension derives a token from the hostname (e.g. `example-irb.cayuse.com`
   yields `example`) and classifies a person as home-institution when their
   email domain or free-text institution contains that token.

This classification is heuristic by design; the override exists precisely for
cases where the auto-detected token is too loose or too strict. No personal data
leaves the device during this resolution — it is pure local string matching.
For a worked configuration example, see
[`docs/DEPLOYMENT_EXAMPLE.md`](../docs/DEPLOYMENT_EXAMPLE.md).

## 2. Data Storage

### 2.1 Storage Location

All data is stored in `chrome.storage.local`, which is:
- Browser-local (not synced across devices via Chrome Sync)
- Sandboxed per-extension (only this extension can access its storage)
- Backed by the browser's LevelDB/IndexedDB storage on disk

### 2.2 Storage Keys

| Key | Type | Contents | Contains PII? |
|-----|------|----------|---------------|
| `currentSubmission` | `Submission` | Most recent scan result: submission metadata + full personnel array with compliance statuses and training records | **Yes** |
| `submissionHistory` | `Record<string, SubmissionScan[]>` | Map of submission ID to array of historical scan results, each containing full personnel array | **Yes** |
| `settings` | `ExtensionSettings` | `{ institutionName, institutionEmailDomains, notificationTemplate }` — all optional local preferences; blank values fall back to auto-detect / built-in template | No (institutional preferences only) |

> **No credentials are stored.** Earlier versions stored an external API key in
> `settings`; that field has been removed. The current `settings` object holds
> only local configuration (institution override and an editable notification
> template) and contains no secrets.

### 2.3 Storage Characteristics

| Property | Value |
|----------|-------|
| Encryption at rest | **None.** `chrome.storage.local` stores data unencrypted in the browser's backing store. |
| Access control | Chrome extension sandbox: only this extension ID can read/write. No other extensions, web pages, or content scripts from other extensions can access it. |
| Capacity | 10 MB default limit for `chrome.storage.local` (the extension does not request `unlimitedStorage`). |
| Persistence | Survives browser restarts. Cleared only on extension uninstall or manual "Clear storage" via `chrome://extensions`. |
| Backup | Not backed up. Lost if browser profile is deleted. |
| Off-device copies | **None.** Data is never transmitted, synced, or uploaded anywhere. |

### 2.4 Sensitive Data in Storage

| Item | Storage Key | Risk |
|------|-------------|------|
| Personnel names + emails | `currentSubmission.personnel[].name`, `.email` | PII persists indefinitely with no automatic cleanup mechanism. |
| Training records | `currentSubmission.personnel[].citiStatus.trainings[]` | Course names and dates; `registeredEmail` is a dormant field and not populated in normal operation today (see §1.1). |
| Submission history | `submissionHistory` | Grows unbounded. Each scan appends a full personnel array. See [Risk Register OPS-02](06-risk-register.md#ops-02-unbounded-submission-history-growth). |

## 3. Data Transmission

### 3.1 No External Transmission

The extension transmits **nothing** off the device. It performs no `fetch`,
`XMLHttpRequest`, WebSocket, or any other network call. There is no AI/LLM, no
external API, no telemetry, and no analytics. All compliance evaluation and
notification rendering happen locally and synchronously in the browser. The only
host permission requested is `*://*.cayuse.com/*`, which scopes where the content
script may read the page DOM — it is not used to send data anywhere.

> **History note (no longer current).** Earlier prototypes generated the PI
> notification by calling an external LLM gateway over HTTPS. That capability —
> and the associated API key — has been **entirely removed**. Notifications are
> now produced by a deterministic local template (see §3.3). This section is
> retained only to document that the prior outbound data flow no longer exists.

### 3.2 Internal Message Passing (On-Device Only)

All inter-component communication uses Chrome's extension message-passing APIs:
- `chrome.runtime.sendMessage()` (side panel <-> service worker)
- `chrome.tabs.sendMessage()` (service worker <-> content script)

This communication is internal to the browser process and never leaves the
machine. Data types passed include `ScrapedSubmissionData`, `Submission`, and
`ExtensionSettings`.

### 3.3 Notification Generation (Local Template, No Model)

When a reviewer requests a PI notification, the text is rendered entirely
on-device by `src/lib/notification-renderer.ts`. A deterministic, user-editable
template is merged with structured deficiency data the evaluator already
produced. Supported merge fields are:

`{{piName}}` · `{{protocolNumber}}` · `{{submissionTitle}}` ·
`{{institutionName}}` · `{{date}}` · `{{deficiencies}}`

The `{{deficiencies}}` field expands to one block per flagged person, assembled
from the evaluator's `description` and `recommendation` strings. No request
leaves the machine. Staff review the rendered text, copy it, and paste it into
Cayuse (e.g. the "Missing information or materials" field) themselves — the
extension does not click through Cayuse's UI (see the documented stub in
`src/content/cayuse-navigator.ts`).

Because the notification text incorporates personnel names and deficiency
details, it is treated as **PII** while displayed; it is not persisted to
storage and is lost when the side panel closes.

## 4. Data Retention

### 4.1 Current State

| Data | Retention | Cleanup Mechanism |
|------|-----------|-------------------|
| `currentSubmission` | Overwritten on each new scan | Implicit (last-write-wins) |
| `submissionHistory` | **Indefinite.** Each scan appends; no TTL, no max entries, no automatic cleanup. | **None** |
| `settings` | Persists until manually changed | User action only |
| PI notification text | Not persisted (rendered in DOM only) | Lost on panel close |

### 4.2 Recommended Retention Practices

- Cap history at a small number of entries per submission ID (FIFO eviction).
- Optionally add age-based cleanup (e.g. delete history entries older than a set
  number of days) to satisfy applicable records-retention requirements.
- Provide a "Clear All Data" action in Settings and a per-submission "Clear
  History" option.
- Document that clearing extension data via `chrome://extensions` removes **all**
  stored data for this extension.

> Retention obligations vary by institution and jurisdiction. Configure cleanup
> to align with your organization's applicable public-records and
> records-retention laws and your IRB's recordkeeping policy. See
> [`docs/DEPLOYMENT_EXAMPLE.md`](../docs/DEPLOYMENT_EXAMPLE.md) for a worked
> example of choosing these settings for one institution.

## 5. Data Classification Summary

| Level | Elements | Handling Requirements |
|---|---|---|
| **PII** | Personnel names, emails, deficiency text, rendered notification text | Minimize retention; data never leaves the device, so no transmission controls are required, but storage-at-rest is unencrypted (a known limitation of `chrome.storage.local`). |
| **Institutional** | Protocol numbers, submission titles, page URLs, resolved institution name | Internal use only; do not share outside the IRB office. |
| **Non-sensitive** | Roles, institutions, compliance statuses, course names, dates, attachment booleans, local settings preferences | Standard handling. |
