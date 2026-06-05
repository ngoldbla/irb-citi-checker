# Chrome Web Store Release Runbook — IRB CITI Checker v1.0.0

**Date:** 2026-06-04
**Status:** Approved, in execution
**Owner:** @ngoldbla (publishing maintainer)

## Goal

Publish **IRB CITI Checker** (Manifest V3 Chrome extension) to the Chrome Web
Store as a **public, listed** item, walking the maintainer through the
interactive submission steps (account setup + dashboard) using Claude in Chrome.

## Decisions (made 2026-06-04)

| Decision | Choice |
|---|---|
| Distribution / visibility | **Public** — listed & searchable (matches MIT, institution-neutral design) |
| Developer account status | Not yet registered — maintainer pays $5 + enables 2-Step Verification (Claude guides, does not perform) |
| Privacy policy hosting | GitHub-rendered `PRIVACY.md` → `https://github.com/ngoldbla/irb-in-chrome/blob/main/PRIVACY.md` **(requires repo to be made public + PRIVACY.md on `main`)** |
| Screenshots | Seed synthetic (fictional) data into `chrome.storage.local`, capture side-panel UI states — no real PII |

## Readiness baseline (from parallel assessment)

- ✅ Valid MV3 manifest, minimal permissions, MV3 CSP, icons present
- ✅ `npm run package` produces a correctly-structured zip (manifest at root)
- ✅ **Verified in code:** zero network primitives, `chrome.storage.local` only,
  no LLM, no remote code — the strongest review asset
- ✅ `PRIVACY.md` + complete `docs/STORE_LISTING.md` worksheet already written
- ✅ Host permission `https://*.cayuse.com/*` is narrow (not `<all_urls>`)
- 🚫 No screenshots exist (store requires ≥1 @ 1280×800)
- 🚫 Dev account: $5 fee + 2-Step Verification not yet done
- 🚫 Privacy policy URL not publicly resolvable (repo private)

## Plan

### Phase A — Repo cleanup (code)
- **A1** `vite.config.ts`: `sourcemap: false` — stop shipping ~142 KB of `.map`
  files + raw TS paths in the store zip.
- **A2** `manifest.json`: tighten host scheme `*://` → `https://*.cayuse.com/*`
  (host_permissions + content_scripts match). Cayuse is HTTPS-only SaaS; removes
  the one any-scheme review flag.
- **A3** `package.json`: add `engines` (`node >=18`).
- **A4** `docs/STORE_LISTING.md`: paste privacy URL, remove stale "PRIVACY.md not
  committed" notes, check off completed checklist items.
- **A5** Replace placeholder icons (79–306 bytes) with a designed 128/48/16 icon
  set (shield + check motif) — the 128px icon is the public store tile.

### Phase B — Build & verify
`npm run package` → assert `manifest.json` at zip root, **no `.map` files**,
icons present, build/typecheck/tests green.

### Phase C — Screenshots (maintainer loads extension once; Claude drives capture)
1. Maintainer: `chrome://extensions` → Developer mode → **Load unpacked** →
   `dist/` (native dialog on a restricted page — cannot be automated).
2. Claude: read extension ID → open `chrome-extension://<id>/sidepanel/index.html`
   → seed fictional submission into `chrome.storage.local` → capture at 1280×800:
   ① deficiency results ② PI notification draft ③ all-compliant ④ Settings
   ⑤ scan-in-progress.

### Phase D — Privacy policy URL
Make repo public (maintainer-authorized), ensure `PRIVACY.md` on `main`, verify
the blob URL resolves 200 logged-out.

### Phase E — Developer account (maintainer drives, Claude guides)
Register at the Developer Console, pay one-time **$5**, enable **2-Step
Verification**, verify a contact email. Claude does not enter payment or 2FA.

### Phase F — Build listing (Claude drives in Chrome; maintainer approves final click)
Upload zip → Store listing (name, 130-char summary, description, category
*Workflow & Planning*, screenshots, icon) → Privacy practices (single purpose, 5
permission justifications, data disclosures, 3 certifications ✓, remote code =
No, privacy URL) → Distribution = **Public**. **Stop at "Submit for review"** for
explicit maintainer go-ahead.

### Phase G — Tag the release
Merge to `main` (green CI) → `git tag v1.0.0 && git push origin v1.0.0` fires
`release.yml`, cutting a GitHub Release with the same zip.

## Guardrails

Claude will not: make payments, enter 2FA, click final *Submit for review* /
*Publish*, or make the GitHub repo public without explicit per-action approval.
All outward-facing / irreversible steps pause for the maintainer.

## Source of truth

- Listing copy & form answers: `docs/STORE_LISTING.md`
- Privacy policy: `PRIVACY.md`
