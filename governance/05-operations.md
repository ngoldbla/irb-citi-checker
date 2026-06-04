# Operations & Maintenance

**Last Reviewed:** 2026-06-04

This document covers building, releasing, and maintaining the extension. The
extension is **fully offline**: it makes zero network requests, contains no
AI/LLM or external services, and stores all data only in `chrome.storage.local`.
It is also **institution-neutral** — it works at any institution served by
Cayuse via a single broad host permission (`*://*.cayuse.com/*`), with the home
institution auto-detected from the Cayuse subdomain and an optional manual
override in Settings.

For a fully worked, institution-specific rollout walkthrough (configuring the
override, distributing the build, onboarding staff), see
[`docs/DEPLOYMENT_EXAMPLE.md`](../docs/DEPLOYMENT_EXAMPLE.md).

## 1. Build Process

### 1.1 Prerequisites

- Node.js (LTS recommended; CI uses Node.js 20)
- npm (comes with Node.js)

### 1.2 Commands

| Command | Action |
|---------|--------|
| `npm install` | Install dev dependencies |
| `npm run build` | Type check (`tsc --noEmit`) + Vite build (runs `prebuild` version sync first) |
| `npm run dev` | Vite build in watch mode (auto-rebuilds on file changes) |
| `npm run typecheck` | Type check only (no build output) |
| `npm test` | Run the Vitest unit test suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run package` | Build, then zip `dist/` into a versioned artifact under `releases/` |

The `prebuild` hook runs `scripts/sync-version.mjs`, which copies the version
from `package.json` into `manifest.json` so the two never drift.

### 1.3 Build Output

The `dist/` directory contains the complete extension:

```
dist/
  manifest.json            # Copied from project root (version synced from package.json)
  service-worker.js        # Background service worker
  service-worker.js.map    # Source map
  content-script.js        # Content script for Cayuse pages
  content-script.js.map    # Source map
  sidepanel/
    index.html             # Side panel UI
    index-[hash].js        # Side panel JavaScript
    index-[hash].css       # Side panel styles
  assets/
    icon-16.png
    icon-48.png
    icon-128.png
```

### 1.4 Build Configuration

- **Bundler:** Vite 6.x (configured in `vite.config.ts`)
- **Language:** TypeScript 5.7 (configured in `tsconfig.json`)
- **Target:** `esnext` (modern Chrome only)
- **Minification:** Disabled (aids debugging)
- **Source maps:** Enabled
- **Path alias:** `@` resolves to `src/`
- **Custom plugin:** Copies `manifest.json` and `src/assets/` to `dist/` after build

## 2. Continuous Integration & Release

### 2.1 Continuous Integration (`.github/workflows/ci.yml`)

A GitHub Actions workflow runs on every push to `main` and on every pull
request targeting `main`. It uses Node.js 20 with npm caching and runs, in order:

1. `npm ci` — install from the lock file for a deterministic dependency tree
2. `npm run typecheck` — TypeScript type checking
3. `npm test` — the Vitest unit suite
4. `npm run build` — full production build

A red CI run blocks the change from being treated as mergeable; keep `main`
green.

### 2.2 Release (`.github/workflows/release.yml`)

Releases are tag-driven. Pushing a tag matching `v*` (e.g. `v1.0.0`) triggers a
workflow that:

1. Installs dependencies with `npm ci`
2. Runs `npm run package` (build + zip of `dist/` into `releases/`)
3. Creates a GitHub Release with `gh release create`, attaching the
   `releases/*.zip` artifact and auto-generated notes

The artifact is a store-uploadable / load-unpackable zip with `manifest.json`
at its root.

### 2.3 Cutting a Release

1. Bump `version` in `package.json` (the build syncs it into `manifest.json`).
2. Commit and merge to `main`; confirm CI is green.
3. Tag the release commit: `git tag v<version> && git push origin v<version>`.
4. The release workflow builds, packages, and publishes the GitHub Release.

## 3. Deployment Process

### 3.1 Side-Loading (development / pilot use)

The built extension can be installed manually for testing or pilot rollouts:

1. Build the extension: `npm run build`
2. Open `chrome://extensions` in Chrome
3. Enable **Developer Mode** (toggle in top-right)
4. Click **"Load unpacked"** (or **"Update"** if already installed)
5. Select the `dist/` directory
6. Verify the extension icon appears in the toolbar
7. Navigate to your Cayuse submission and test scan functionality

### 3.2 Updating an Existing Installation

1. Pull latest code and rebuild: `npm run build`
2. Open `chrome://extensions`
3. Find "IRB CITI Checker"
4. Click the **refresh icon** (circular arrow) to reload from `dist/`
5. Verify via a test scan

### 3.3 Distribution

- Release artifacts are produced automatically by the release workflow (a
  versioned zip attached to each GitHub Release).
- The same zip can be uploaded to the Chrome Web Store or distributed directly
  to staff for "Load unpacked" / unpacked-install use.
- Version is tracked in `package.json` and mirrored into `manifest.json` by the
  `sync-version` prebuild step (currently `1.0.0`).
- Because the extension is offline and stores data only locally, distribution
  involves no server, API key, or backend provisioning. See
  [`docs/DEPLOYMENT_EXAMPLE.md`](../docs/DEPLOYMENT_EXAMPLE.md) for a complete
  rollout example, including configuring the institution override in Settings.

## 4. Dependency Management

### 4.1 Dependencies

**Runtime dependencies:** None (zero external libraries shipped in the extension).

**Dev dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/chrome` | ^0.0.287 | TypeScript type definitions for Chrome extension APIs |
| `typescript` | ^5.7.0 | TypeScript compiler |
| `vite` | ^6.1.0 | Build tool and bundler |
| `vitest` | ^2.1.0 | Unit test runner |

### 4.2 Lock File

`package-lock.json` is committed for reproducible builds. CI uses `npm ci` (not
`npm install`) to guarantee deterministic dependency resolution; mirror that in
any deployment context.

### 4.3 Vulnerability Scanning

The dependency surface is intentionally tiny (build/test tooling only — nothing
is shipped at runtime), which limits exposure.

**Recommendation:**
- Run `npm audit` before each release.
- Consider adding `npm audit --audit-level=high` as a CI step.
- Consider enabling GitHub Dependabot for automated vulnerability alerts.

## 5. Cayuse DOM Change Handling

### 5.1 Risk Profile

The extension depends on specific DOM structure in Cayuse (Semantic UI framework
+ custom `e3-table` components). Cayuse is a third-party SaaS product served from
`*.cayuse.com`; UI updates are outside any single institution's control and can
happen without notice.

**Critical selector dependencies** (defined in `src/content/selectors.ts`):

| Selector | Purpose | Breakage Impact |
|----------|---------|-----------------|
| `[class*="assignment-type-"]` | Identify personnel containers | No personnel scraped |
| `td.e3-table-row-cell` | Extract data from table cells | No data from any cell |
| `td.open-person-training-cell` | Find "View" training buttons | No training records |
| `.modal-dialog.training-finder` | Identify training modal | Training data unavailable |
| `.training-finder table.e3-table` | Find training data table | Empty training records |
| `.modal.fade.in .close` | Close training modal | Modal stays open; scan hangs |

The scraper has multiple fallback strategies in `cayuse-scraper.ts`
(`findViewButton()`, `findTrainingTable()`) but still depends on the basic
table/cell structure.

### 5.2 Detection

**No automated DOM change detection.** Breakage manifests as:

| Symptom | Likely Cause | Console Indicator |
|---------|-------------|-------------------|
| 0 personnel found | Assignment container selector broken | `scrapePersonnel: found 0 assignment containers` |
| Personnel found but 0 trainings | Training button or modal selector broken | `No View button found for [name]` |
| Training modal opens but no data | Training table selector broken | `No training table found in modal` |
| Scan hangs / takes very long | Modal close button selector broken | `Timed out waiting for element removal` |

### 5.3 Recovery Procedure

See [Runbook Procedure 3: Update DOM Selectors After Cayuse UI Change](08-runbook.md#procedure-3-update-dom-selectors-after-cayuse-ui-change).

### 5.4 Preventive Measures

- Monitor Cayuse release notes or change notifications (if available from the vendor).
- Consider adding a DOM health check on page load that validates expected
  elements exist and surfaces warnings in the side panel.
- Maintain a changelog of selector updates with dates.

## 6. Monitoring and Observability

### 6.1 Current State

- **Console logging:** Extensive `console.log` statements throughout
  `cayuse-scraper.ts` prefixed with `[IRB Checker]`. Logs include:
  - Container counts, personnel found per section
  - Training records per person
  - Modal open/close events
  - Fallback selector usage
  - Scrape totals and timing
- **UI error display:** Error toast notifications at the bottom of the side panel (5-second duration)
- **Loading indicator:** Overlay displayed during scan and notification rendering

### 6.2 What Is NOT Monitored

- No external monitoring, alerting, or log aggregation (and, by design, none is
  possible — the extension makes no network requests).
- No error reporting to external services.
- No usage metrics or remote health checks.
- No automated detection of scraping failures.

### 6.3 Recommended Improvements

1. Surface scraper health warnings in the side panel (e.g., "0 personnel found — possible Cayuse DOM change").
2. Add structured audit logging for compliance-relevant events (see [Risk Register OPS-05](06-risk-register.md#ops-05-no-audit-logging)).

## 7. Incident Response

### 7.1 Extension Not Scraping Data

**Severity:** High (extension non-functional)

1. Check console for `[IRB Checker]` log messages (DevTools on the Cayuse tab).
2. Verify the user is on a Cayuse domain (`*.cayuse.com`) and on a submission form page.
3. Verify content script injection (check for the `PONG` response to a `PING`).
4. If selectors have changed, follow [Runbook Procedure 3](08-runbook.md#procedure-3-update-dom-selectors-after-cayuse-ui-change).

### 7.2 Notification Text Looks Wrong or Empty

**Severity:** Low (notification is produced locally and is fully editable)

Notifications are rendered by a **deterministic, offline template** in
`src/lib/notification-renderer.ts` — there is no model and no network call, so
there is nothing to "fail" externally. If the generated text is wrong:

1. Confirm the scan actually found deficiencies (an all-compliant submission
   yields "No outstanding CITI compliance items.").
2. Check the active template in Settings. The default lives in
   `DEFAULT_NOTIFICATION_TEMPLATE`; a saved custom template overrides it.
3. Confirm merge fields are spelled correctly. Supported fields are
   `{{piName}}`, `{{protocolNumber}}`, `{{submissionTitle}}`,
   `{{institutionName}}`, `{{date}}`, and `{{deficiencies}}`. Unknown
   placeholders are intentionally left intact rather than blanked.
4. If `{{institutionName}}` resolves incorrectly, the home-institution detection
   may need a manual override (institution name + home email domains) in
   Settings — see `src/lib/institution.ts` and
   [`docs/DEPLOYMENT_EXAMPLE.md`](../docs/DEPLOYMENT_EXAMPLE.md).

Staff copy the rendered text and paste it into Cayuse themselves; the extension
does not transmit or send anything.

### 7.3 Extension Crash / Service Worker Termination

**Severity:** Low (self-recovering)

- Manifest V3 service workers are ephemeral; Chrome may terminate them after inactivity.
- All state is in `chrome.storage.local` (persistent), so no data loss on restart.
- The side panel re-fetches state on init via the `GET_SUBMISSION` message.
- The service worker automatically restarts when a message is sent to it.

## 8. Testing

### 8.1 Automated Tests

The project ships a **Vitest** unit suite (run with `npm test`, or
`npm run test:watch` while developing). Tests live in `tests/` and run on every
push and pull request via the CI workflow:

| Test file | Covers |
|-----------|--------|
| `tests/citi-evaluator.test.ts` | Compliance rule evaluation (`src/lib/citi-evaluator.ts`) |
| `tests/date-utils.test.ts` | Expiration / date calculations (`src/lib/date-utils.ts`) |
| `tests/institution.test.ts` | Home-institution resolution and matching (`src/lib/institution.ts`) |
| `tests/notification-renderer.test.ts` | Deterministic template rendering (`src/lib/notification-renderer.ts`) |

Because notification rendering and compliance evaluation are pure, offline
functions, they are fully unit-testable without a browser or network.

### 8.2 Manual Testing Checklist

DOM scraping against live Cayuse pages still requires manual verification:

1. [ ] `npm run build` succeeds without errors
2. [ ] `npm run typecheck` passes
3. [ ] `npm test` passes
4. [ ] Extension loads in Chrome without error badges
5. [ ] Navigate to a Cayuse submission form (`*.cayuse.com`)
6. [ ] "Scan Personnel" returns personnel with correct names and roles
7. [ ] Training records appear for personnel with CITI training
8. [ ] Compliance statuses match expected values for known test submissions
9. [ ] Deficiency descriptions are correct and actionable
10. [ ] "Generate Notification" produces a correct draft from the active template
11. [ ] Home institution / external classification is correct (or fixable via the Settings override)
12. [ ] Settings save and load correctly
13. [ ] Extension works after Chrome restart (data persists)

### 8.3 Recommended Additional Test Coverage

| Layer | Target | Framework |
|-------|--------|-----------|
| Integration tests | `storage.ts` (mock `chrome.storage`) | Vitest + chrome.storage mock |
| DOM tests | `cayuse-scraper.ts` (mock Cayuse DOM) | Vitest + jsdom |
| E2E tests | Full scan workflow | Playwright with Chrome extension support |
