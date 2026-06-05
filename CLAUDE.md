# IRB CITI Checker — Chrome Extension

## Purpose

An institution-neutral Chrome extension (Manifest V3) for IRB compliance staff.
Scans Cayuse submission forms to verify CITI Human Subjects training compliance
for all listed personnel. When deficiencies are found, it renders an editable
notification draft for the PI from a local template.

**Fully offline.** The extension makes zero network requests and contains no
AI/LLM. All evaluation and notification text is produced deterministically on
the client. Data is stored only in `chrome.storage.local` and is never
transmitted.

**Works at any institution.** A single broad host permission
(`https://*.cayuse.com/*`) covers every Cayuse tenant. The home institution is
auto-detected from the Cayuse subdomain, with an optional manual override
(institution name + home email domains) in Settings. There are no hardcoded
institution names or domains.

## Architecture

```
┌─────────────┐    messages     ┌──────────────┐    messages    ┌─────────────┐
│  Side Panel  │ ◄────────────► │Service Worker │ ◄───────────► │Content Script│
│  (main.ts)   │                │  (hub/router) │               │(cayuse-     │
│  UI + state  │                │  evaluation   │               │ scraper.ts) │
└─────────────┘                └──────────────┘               └─────────────┘
```

- **Content script** (`src/content/cayuse-scraper.ts`): Scrapes personnel data
  and training records from the Cayuse DOM. Opens training modals sequentially.
  Matches `https://*.cayuse.com/*`.
- **Service worker** (`src/background/service-worker.ts`): Message router,
  compliance evaluation, local notification rendering, storage. Validates that
  the active tab is a Cayuse host via a hostname-suffix check (`*.cayuse.com`).
- **Side panel** (`src/sidepanel/`): UI rendering, user interactions.
  - `components/scan-progress.ts` — scan progress bar component
  - `components/notification-draft.ts` — notification draft, CTA prompt, generating state
- **Notification renderer** (`src/lib/notification-renderer.ts`): Deterministic,
  offline template renderer. Merges fields (`{{piName}}`, `{{protocolNumber}}`,
  `{{submissionTitle}}`, `{{institutionName}}`, `{{date}}`, `{{deficiencies}}`)
  into the user-editable template. `{{deficiencies}}` expands to one block per
  flagged person, built from the evaluator's structured `description` /
  `recommendation` output. `DEFAULT_NOTIFICATION_TEMPLATE` is used unless the
  user saved a custom one in Settings. Staff copy the result and paste it into
  Cayuse themselves.
- **Institution resolution** (`src/lib/institution.ts`): Makes the extension
  institution-neutral. `resolveInstitution()` derives the home institution from
  an explicit Settings override (name + email domains, authoritative when
  present) or, failing that, auto-detects a token from the Cayuse hostname
  (e.g. `example-irb.cayuse.com` → `example`). `isHomeInstitution()` classifies
  each scraped person as home vs. external, which drives the remediation text.
- **Evaluator** (`src/lib/citi-evaluator.ts`): Applies the compliance rules to
  scraped personnel + training records, producing per-person status and
  structured deficiencies.
- **Navigator** (`src/content/cayuse-navigator.ts`): STUB for the Return-to-PI
  workflow (pending SME consultation — see TODO block in file).

## Key Gaps

- **Return-to-PI workflow**: The `cayuse-navigator.ts` module is an intentional,
  deferred stub. The extension generates message *text* only; it does not click
  through Cayuse's UI. The exact Cayuse UI flow for returning a submission with
  comments is unknown. See the TODO block in that file for what the SME needs to
  provide.
- **Dormant rules**: Rules 4 (email mismatch) and 3 (external PDF) in
  `citi-evaluator.ts` cannot fully trigger because `registeredEmail` and
  `hasPdfAttachment` are never populated from the Cayuse training modal.
  They are kept intentionally for future data sources (e.g. a CITI API
  integration or enhanced scraping). DO NOT REMOVE.

## Build

```bash
npm run build       # TypeScript check + Vite build → dist/
npm run dev         # Vite build in watch mode
npm run typecheck   # TypeScript only (no build)
npm test            # Run Vitest test suite once
npm run test:watch  # Vitest in watch mode
npm run package     # Build + zip dist/ for distribution
```

CI runs on GitHub Actions: `.github/workflows/ci.yml` (typecheck + tests +
build) and `.github/workflows/release.yml` (packaged release).

## Testing

Automated unit tests run with Vitest (`npm test`) — the deterministic evaluator,
institution resolution, and notification renderer are pure functions and fully
testable. For end-to-end verification, build and load `dist/` as an unpacked
Chrome extension, navigate to a Cayuse submission form, and use the side panel.

## Message Flow

1. User clicks "Scan" → `TRIGGER_SCAN` → service worker → `REQUEST_SCRAPE` → content script
2. Content script scrapes, emits `SCAN_PROGRESS` per person (fire-and-forget broadcast)
3. Content script returns `SCRAPE_RESULT` → service worker resolves the home
   institution (Settings override or hostname auto-detect), evaluates compliance,
   persists the submission → `SCAN_COMPLETE` → side panel
4. If deficiencies found:
   - Fresh scan → auto-triggers `GENERATE_NOTIFICATION`
   - Panel reload → shows CTA prompt; user clicks to generate
   - `GENERATE_NOTIFICATION` → service worker calls `renderNotification()`
     **locally and synchronously** (no network, no model) → `NOTIFICATION_DRAFT`
     → side panel. The draft is editable; staff copy/paste it into Cayuse.
5. "Return to PI" sends `RETURN_TO_PI` → service worker → `REQUEST_NAVIGATE` → content script (stub)
