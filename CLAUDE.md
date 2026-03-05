# IRB CITI Compliance Checker — Chrome Extension

## Purpose

Chrome extension for KSU IRB compliance staff. Scans Cayuse submission forms
to verify CITI Human Subjects training compliance for all listed personnel.
When deficiencies are found, auto-generates a notification draft for the PI.

## Architecture

```
┌─────────────┐    messages     ┌──────────────┐    messages    ┌─────────────┐
│  Side Panel  │ ◄────────────► │Service Worker │ ◄───────────► │Content Script│
│  (main.ts)   │                │  (hub/router) │               │(cayuse-     │
│  UI + state  │                │  evaluation   │               │ scraper.ts) │
└─────────────┘                └──────────────┘               └─────────────┘
```

- **Content script** (`src/content/cayuse-scraper.ts`): Scrapes personnel data
  and training records from Cayuse DOM. Opens training modals sequentially.
- **Service worker** (`src/background/service-worker.ts`): Message router,
  compliance evaluation, LLM notification generation, storage.
- **Side panel** (`src/sidepanel/`): UI rendering, user interactions.
- **Navigator** (`src/content/cayuse-navigator.ts`): STUB for Return-to-PI
  workflow (pending SME consultation — see TODO block in file).

## Key Gaps

- **Return-to-PI workflow**: The `cayuse-navigator.ts` module is a stub.
  The exact Cayuse UI flow for returning a submission with comments is
  unknown. See the TODO block in that file for what the SME needs to provide.
- **Dormant rules**: Rules 4 (email mismatch) and 3 (external PDF) in
  `citi-evaluator.ts` cannot fully trigger because `registeredEmail` and
  `hasPdfAttachment` are never populated from the Cayuse training modal.
  They are kept intentionally for future data sources. DO NOT REMOVE.

## Build

```bash
npm run build       # TypeScript check + Vite build → dist/
npm run dev         # Vite build in watch mode
npm run typecheck   # TypeScript only (no build)
```

## Testing

Manual testing only. Load `dist/` as an unpacked Chrome extension.
Navigate to a Cayuse submission form and use the side panel.

## Message Flow

1. User clicks "Scan" → `TRIGGER_SCAN` → service worker → `REQUEST_SCRAPE` → content script
2. Content script scrapes, emits `SCAN_PROGRESS` per person (fire-and-forget broadcast)
3. Content script returns `SCRAPE_RESULT` → service worker evaluates → `SCAN_COMPLETE` → side panel
4. Side panel auto-triggers `GENERATE_NOTIFICATION` if deficiencies found
5. "Return to PI" sends `RETURN_TO_PI` → service worker → `REQUEST_NAVIGATE` → content script
