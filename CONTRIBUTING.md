# Contributing to IRB CITI Checker

Thanks for your interest in improving IRB CITI Checker! This is a community
project for IRB and research-compliance staff, and contributions of all
sizes — bug reports, docs fixes, tests, and features — are genuinely welcome.

This guide explains how to set up the project, make a change, and open a pull
request. If anything here is unclear, please open a [discussion or
issue](https://github.com/ngoldbla/irb-in-chrome/issues) — improving these
instructions is a great first contribution.

Before participating, please read our [Code of Conduct](CODE_OF_CONDUCT.md).
We expect everyone in the project to follow it.

---

## What this project is (and isn't)

A couple of design principles shape every contribution. Please keep them in
mind before you start:

- **It is fully offline.** The extension makes **zero** network requests. There
  is no AI/LLM, no API keys, no telemetry, and no external services. All
  processing happens locally in the browser, and data is kept only in
  `chrome.storage.local`.
- **It is institution-neutral.** The extension works at any Cayuse tenant via
  the single host permission `https://*.cayuse.com/*`. The home institution is
  auto-detected from the Cayuse subdomain, with an optional manual override in
  Settings. Please don't hardcode institution names, domains, or other
  site-specific assumptions.

Changes that add network calls, external dependencies, or AI will not be
accepted. See [Code style](#code-style) for the details.

---

## Prerequisites

- **Node.js 20 or newer** (the CI runs on Node 20). We recommend
  [nvm](https://github.com/nvm-sh/nvm) or
  [fnm](https://github.com/Schniz/fnm) to manage versions.
- **npm** (bundled with Node).
- **Google Chrome** (or another Chromium-based browser) for manual testing.

Check your version:

```bash
node --version   # should print v20.x or higher
```

## Setup

```bash
git clone https://github.com/ngoldbla/irb-in-chrome.git
cd irb-in-chrome
npm install
```

`npm install` only pulls in dev tooling (TypeScript, Vite, Vitest). The
extension itself ships **no runtime dependencies**.

## Development loop

| Command | What it does |
| --- | --- |
| `npm run dev` | Build to `dist/` in watch mode — rebuilds on every save. |
| `npm run build` | Type-check, then produce a production build in `dist/`. |
| `npm run typecheck` | Run the TypeScript compiler with no emit (types only). |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode while you iterate. |

A typical session: run `npm run dev` in one terminal so `dist/` stays fresh,
and `npm run test:watch` in another while you work.

## Loading the extension for manual testing

There are no automated end-to-end tests against Cayuse, so manual testing on a
real submission page is an important part of any UI or scraping change.

1. Build the extension: `npm run build` (or leave `npm run dev` running).
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the project's `dist/` folder.
5. Open a submission in a Cayuse Human Ethics (IRB) instance
   (`https://<your-tenant>.cayuse.com/...`).
6. Click the IRB CITI Checker toolbar icon to open the side panel, then click
   **Scan Personnel**.

After rebuilding, click the **reload** (↻) icon on the extension's card in
`chrome://extensions` to pick up your changes. If you change the service
worker or content script, reload the Cayuse tab as well.

> No real Cayuse instance handy? You can still exercise much of the logic
> through the unit tests, which cover the compliance evaluator, date math,
> institution detection, and template rendering without a browser.

---

## Code style

- **TypeScript strict mode.** The project compiles with `strict`,
  `noUnusedLocals`, and `noUnusedParameters` enabled (see `tsconfig.json`).
  `npm run typecheck` must pass with no errors.
- **Match the existing patterns.** Follow the conventions already in the file
  you're editing — message passing between the content script, service worker,
  and side panel; small focused modules in `src/lib/`; and the typed message
  contracts in `src/types/`.
- **No new runtime dependencies.** The extension intentionally ships with zero
  runtime dependencies. New `dependencies` in `package.json` will be declined.
  Dev-only tooling changes are fine to propose, but keep them minimal.
- **Keep it offline.** Never add `fetch`, `XMLHttpRequest`, WebSockets,
  remote scripts, analytics, or any AI/LLM integration. Notifications are
  produced by the local, editable mail-merge template — not a model.
- **Don't remove dormant rules.** The external-PDF and email-mismatch rules in
  the evaluator are intentionally retained for future data sources. Leave them
  (and their notes) in place.
- **The Cayuse "Return to PI" automation is a documented stub.** See
  `src/content/cayuse-navigator.ts`. The extension generates message *text*; it
  does not click through Cayuse's UI. Please don't wire up browser automation
  there without first discussing it in an issue.

## Tests

We use [Vitest](https://vitest.dev/). Tests live in `tests/` and are named
`*.test.ts`. Existing suites cover the compliance evaluator, date utilities,
institution detection, and the notification renderer — they're good models to
copy.

To add a test:

1. Create or extend a file in `tests/`, e.g. `tests/my-feature.test.ts`.
2. Import the module under test from `src/` and write `describe`/`it` blocks:

   ```ts
   import { describe, it, expect } from 'vitest';
   import { myFunction } from '../src/lib/my-feature';

   describe('myFunction', () => {
     it('does the thing', () => {
       expect(myFunction(input)).toBe(expected);
     });
   });
   ```

3. Run `npm test` (or `npm run test:watch`) and make sure everything is green.

Please add or update tests for any change to the compliance logic, date math,
institution detection, or template rendering. Bug fixes should ideally include
a regression test that fails before your fix and passes after.

## Pull request process

1. **Open or find an issue first** for anything beyond a trivial fix, so we can
   agree on the approach before you invest time.
2. **Branch** from `main` with a descriptive name, e.g.
   `fix/expired-training-edge-case` or `feat/settings-import-export`.
3. **Make focused commits** with clear messages. Explain *why* in the body when
   it isn't obvious from the diff.
4. **Run the full check locally** before pushing:

   ```bash
   npm run typecheck
   npm test
   npm run build
   ```

   These are exactly what CI runs (`.github/workflows/ci.yml`), so a green run
   locally means a green run in CI.
5. **Open the PR** against `main`. Describe what changed and why, link the
   issue it resolves (e.g. "Closes #123"), and note how you tested it —
   including manual testing on a Cayuse page if your change touches scraping or
   the UI.
6. **Ensure CI is green.** A maintainer will review once checks pass. Please be
   responsive to review feedback; we aim to be the same in return.

Small, well-scoped PRs are much easier to review and merge than large ones.
When in doubt, split your work.

---

## Where to learn more

- **Architecture, data handling, and security:** the
  [`governance/`](governance/) directory documents the system design
  ([01-architecture.md](governance/01-architecture.md)), data governance, privacy
  and compliance, security, operations, the risk register, change management,
  and a runbook. Start with the [governance README](governance/README.md).
- **Project overview and usage:** the [README](README.md).
- **Release history:** the [CHANGELOG](CHANGELOG.md).
- **Contributor expectations:** the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting security issues

**Please do not report security vulnerabilities through public GitHub issues.**
Follow the responsible-disclosure process in [SECURITY.md](SECURITY.md)
instead. Because the extension is fully offline and stores data only in the
local browser profile, the most relevant concerns involve the permissions it
requests and the data it reads from the page — see the
[Security governance doc](governance/04-security.md) for the threat model.

---

Thank you for helping make IRB compliance review a little easier for everyone. 💛
