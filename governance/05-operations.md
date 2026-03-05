# Operations & Maintenance

**Last Reviewed:** 2026-03-04

## 1. Build Process

### 1.1 Prerequisites

- Node.js (LTS recommended)
- npm (comes with Node.js)

### 1.2 Commands

| Command | Action |
|---------|--------|
| `npm install` | Install dev dependencies |
| `npm run build` | Type check (`tsc --noEmit`) + Vite build |
| `npm run dev` | Vite build in watch mode (auto-rebuilds on file changes) |
| `npm run typecheck` | Type check only (no build output) |

### 1.3 Build Output

The `dist/` directory contains the complete extension:

```
dist/
  manifest.json            # Copied from project root
  service-worker.js        # Background service worker
  service-worker.js.map    # Source map
  content-script.js        # Content script for Cayuse pages
  content-script.js.map    # Source map
  sidepanel/
    index.html             # Side panel UI
    index-[hash].js        # Side panel JavaScript
    index-[hash].css       # Side panel styles (from panel.css)
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

## 2. Deployment Process

### 2.1 Current Method: Manual Side-Loading

There is no automated deployment pipeline. The extension is manually installed:

1. Build the extension: `npm run build`
2. Open `chrome://extensions` in Chrome
3. Enable **Developer Mode** (toggle in top-right)
4. Click **"Load unpacked"** (or **"Update"** if already installed)
5. Select the `dist/` directory
6. Verify the extension icon appears in the toolbar
7. Navigate to a Cayuse submission and test scan functionality

### 2.2 Updating an Existing Installation

1. Pull latest code and rebuild: `npm run build`
2. Open `chrome://extensions`
3. Find "IRB CITI Compliance Checker"
4. Click the **refresh icon** (circular arrow) to reload from `dist/`
5. Verify via a test scan

### 2.3 Distribution

- **Not published** to Chrome Web Store
- Extension is distributed as a built `dist/` directory or source code
- Only authorized IRB staff should have access to the extension
- Version tracked in both `package.json` and `manifest.json` (currently `0.1.0`)

## 3. Dependency Management

### 3.1 Dependencies

**Runtime dependencies:** None (zero external libraries at runtime).

**Dev dependencies (3 total):**

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/chrome` | ^0.0.287 | TypeScript type definitions for Chrome extension APIs |
| `typescript` | ^5.7.0 | TypeScript compiler |
| `vite` | ^6.1.0 | Build tool and bundler |

### 3.2 Lock File

`package-lock.json` is committed for reproducible builds. Always run `npm ci` (not `npm install`) in CI/deployment contexts to ensure deterministic dependency resolution.

### 3.3 Vulnerability Scanning

**Current state:** No automated dependency vulnerability scanning. No Dependabot, no `npm audit` in CI, no scheduled audits.

**Recommendation:**
- Run `npm audit` before each release
- Add `npm audit --audit-level=high` as a pre-build step
- Consider enabling GitHub Dependabot for automated vulnerability alerts

## 4. Cayuse DOM Change Handling

### 4.1 Risk Profile

The extension depends on specific DOM structure in Cayuse (Semantic UI framework + custom `e3-table` components). Cayuse is a third-party SaaS product; updates are outside KSU's control and can happen without notice.

**Critical selector dependencies** (defined in `src/content/selectors.ts`):

| Selector | Purpose | Breakage Impact |
|----------|---------|-----------------|
| `[class*="assignment-type-"]` | Identify personnel containers | No personnel scraped |
| `td.e3-table-row-cell` | Extract data from table cells | No data from any cell |
| `td.open-person-training-cell` | Find "View" training buttons | No training records |
| `.modal-dialog.training-finder` | Identify training modal | Training data unavailable |
| `.training-finder table.e3-table` | Find training data table | Empty training records |
| `.modal.fade.in .close` | Close training modal | Modal stays open; scan hangs |

The scraper has multiple fallback strategies in `cayuse-scraper.ts` (`findViewButton()`, `findTrainingTable()`) but still depends on the basic table/cell structure.

### 4.2 Detection

**No automated DOM change detection.** Breakage manifests as:

| Symptom | Likely Cause | Console Indicator |
|---------|-------------|-------------------|
| 0 personnel found | Assignment container selector broken | `scrapePersonnel: found 0 assignment containers` |
| Personnel found but 0 trainings | Training button or modal selector broken | `No View button found for [name]` |
| Training modal opens but no data | Training table selector broken | `No training table found in modal` |
| Scan hangs / takes very long | Modal close button selector broken | `Timed out waiting for element removal` |

### 4.3 Recovery Procedure

See [Runbook Procedure 3: Update DOM Selectors After Cayuse Change](08-runbook.md#procedure-3-update-dom-selectors-after-cayuse-ui-change).

### 4.4 Preventive Measures

- Monitor Cayuse release notes or change notifications (if available from vendor)
- Consider adding a DOM health check on page load that validates expected elements exist and surfaces warnings in the side panel
- Maintain a changelog of selector updates with dates

## 5. Monitoring and Observability

### 5.1 Current State

- **Console logging:** Extensive `console.log` statements throughout `cayuse-scraper.ts` prefixed with `[IRB Checker]`. Logs include:
  - Container counts, personnel found per section
  - Training records per person
  - Modal open/close events
  - Fallback selector usage
  - Scrape totals and timing
- **UI error display:** Error toast notifications at the bottom of the side panel (5-second duration)
- **Loading indicator:** Overlay displayed during scan and notification generation

### 5.2 What Is NOT Monitored

- No external monitoring, alerting, or log aggregation
- No error reporting to external services (Sentry, etc.)
- No usage metrics or health checks
- No automated detection of scraping failures

### 5.3 Recommended Improvements

1. Surface scraper health warnings in the side panel (e.g., "0 personnel found - possible Cayuse DOM change")
2. Add structured audit logging for compliance-relevant events (see [Risk Register OPS-05](06-risk-register.md#ops-05-no-audit-logging))
3. Consider optional error reporting (with user consent) for automated breakage detection

## 6. Incident Response

### 6.1 Extension Not Scraping Data

**Severity:** High (extension non-functional)

1. Check console for `[IRB Checker]` log messages (DevTools on Cayuse tab)
2. Verify user is on a correct Cayuse domain and submission form page
3. Verify content script injection (check for PONG response to PING)
4. If selectors have changed, follow [Runbook Procedure 3](08-runbook.md#procedure-3-update-dom-selectors-after-cayuse-ui-change)

### 6.2 LLM Notification Generation Failing

**Severity:** Medium (core scraping still works; notification is supplementary)

1. Check Portkey API key and base URL in Settings
2. Check network connectivity to Portkey endpoint
3. Check service worker console for API error messages
4. See [Runbook Procedure 6](08-runbook.md#procedure-6-investigate-llm-notification-failure) for error code guide

### 6.3 Extension Crash / Service Worker Termination

**Severity:** Low (self-recovering)

- Manifest v3 service workers are ephemeral; Chrome may terminate them after inactivity
- All state is in `chrome.storage.local` (persistent), so no data loss on restart
- The side panel re-fetches state on init via `GET_SUBMISSION` message
- Service worker automatically restarts when a message is sent to it

## 7. Testing

### 7.1 Current State

**No automated tests exist.** There are no test files, no test framework in `package.json`, and no test commands.

### 7.2 Manual Testing Checklist

1. [ ] `npm run build` succeeds without errors
2. [ ] `npm run typecheck` passes
3. [ ] Extension loads in Chrome without error badges
4. [ ] Navigate to a Cayuse submission form
5. [ ] "Scan Personnel" returns personnel with correct names and roles
6. [ ] Training records appear for personnel with CITI training
7. [ ] Compliance statuses match expected values for known test submissions
8. [ ] Deficiency descriptions are correct and actionable
9. [ ] "Generate Notification" produces a reasonable email draft (if LLM configured)
10. [ ] Settings save and load correctly
11. [ ] Extension works after Chrome restart (data persists)

### 7.3 Recommended Test Infrastructure

| Layer | Target | Framework |
|-------|--------|-----------|
| Unit tests | `citi-evaluator.ts` (6 rules + edge cases) | Vitest (integrates with existing Vite setup) |
| Unit tests | `date-utils.ts` (expiration calculations) | Vitest |
| Unit tests | `notification-templates.ts` (prompt construction) | Vitest |
| Integration tests | `storage.ts` (mock `chrome.storage`) | Vitest + chrome.storage mock |
| DOM tests | `cayuse-scraper.ts` (mock Cayuse DOM) | Vitest + jsdom or Playwright |
| E2E tests | Full scan workflow | Playwright with Chrome extension support |
