# Design: De-KSU, De-LLM, Open-Source Conversion of IRB CITI Checker

**Date:** 2026-06-04
**Status:** Approved → implemented

## Goal

Convert a Kennesaw-State-specific, LLM-dependent, sideloaded Chrome extension
into a **fully offline, institution-neutral, MIT-licensed open-source** project
that any Cayuse-using IRB office can install in roughly one click and use with no
configuration.

A property that emerges from the design and is leaned on throughout: after the
LLM is removed, the extension makes **zero network requests**. This is the
strongest asset for both the privacy story and the Chrome Web Store review.

## Decisions (from brainstorming)

- **Distribution:** Chrome Web Store primary, GitHub Releases zip as the
  free/fallback path. Repo prepares everything store-ready; publishing is manual.
- **Institution-neutral domains:** a single broad host match `*://*.cayuse.com/*`.
  Cayuse is one SaaS vendor, so every institution's tenant lives under
  `*.cayuse.com`; a hostname-suffix check needs no per-site configuration.
- **Notifications:** keep the feature, but render it deterministically from an
  **editable mail-merge template** (no LLM). Built-in default ships so it works
  with zero setup; the user's saved template persists in `chrome.storage`.
- **Home-institution classification:** auto-detect from the Cayuse subdomain
  (`yourschool-irb.cayuse.com` → token `yourschool`), with a manual override
  (institution name + home email domains) in Settings.
- **Return to PI:** the extension **generates the message text** for staff to
  paste into Cayuse; it does **not** automate Cayuse's UI. Live inspection
  confirmed the routing is workflow-state-gated and built on Semantic UI (not
  `<button>` elements), so reliable automation would be fragile; that work stays
  a documented stub.
- **Name:** "IRB CITI Checker" (display), `irb-citi-checker` (package).
- **Governance docs:** keep and genericize (scrub KSU/Portkey/Georgia specifics;
  move deployment-specific material to `docs/DEPLOYMENT_EXAMPLE.md`).

## Workstreams

### A. Remove all AI/LLM
- Delete `src/lib/llm-client.ts` (the only network-calling module).
- Replace the LLM prompt builder with `src/lib/notification-renderer.ts`, a pure
  `(submission, template, targetNames?) → string` function that merges the
  evaluator's existing `description`/`recommendation` strings into the template.
- Strip `portkeyApiKey` / `portkeyBaseUrl` / `llmModel` from settings, storage,
  and the side-panel UI; repurpose Settings to hold institution + template config.

### B. Institution-neutral
- `manifest.json` + content-script match + `isCayuseTab`/`isCayuseUrl` → broad
  `*.cayuse.com`.
- New `src/lib/institution.ts`: `resolveInstitution(hostname, override)` and
  `isHomeInstitution` / `isHomeEmail`.
- `citi-evaluator.ts`: replace `KSU_EMAIL_DOMAINS` / `determineIsKsu`; rename the
  `isKsuPersonnel` model field to `isHomeInstitution`; de-hardcode wording to use
  the resolved institution name.
- Dormant Rules 3 & 4 and the `cayuse-navigator.ts` stub are retained unchanged.

### C. Install & distribution
- Store-ready manifest (generic name/description, broad match, CSP), version bump
  to 1.0.0.
- `scripts/sync-version.mjs` (manifest ↔ package version) and
  `scripts/package.mjs` (zip `dist/` → `releases/`).
- GitHub Actions: `ci.yml` (typecheck/test/build) and `release.yml` (tag → zip →
  GitHub Release).
- `PRIVACY.md` and `docs/STORE_LISTING.md` for Web Store submission.

### D. Open-source scaffolding
- `LICENSE` (MIT), `README.md` (badges, install, privacy), `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, issue/PR templates.
- Vitest unit tests for `citi-evaluator`, `date-utils`, `institution`, and
  `notification-renderer`.
- Genericize the `governance/` docs and `CLAUDE.md`.

## Explicitly out of scope (future work)
- Cayuse "return to PI" click-through automation (kept as a stub).
- Non-Cayuse IRB systems.
- Configurable compliance-rules engine (e.g. 2-year vs. 3-year validity).
- `.crx` / enterprise-policy signing pipeline.
