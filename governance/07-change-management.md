# Change Management

**Last Reviewed:** 2026-03-04

This document describes how changes to the IRB CITI Checker are proposed,
reviewed, tested, versioned, and released. It is written for an open-source,
community-maintained project: review is performed by project **maintainers** and
contributors rather than any single institution's office. If you are adopting
the extension at a particular institution and want to layer your own internal
approvals on top of this process, see the worked example in
[`../docs/DEPLOYMENT_EXAMPLE.md`](../docs/DEPLOYMENT_EXAMPLE.md) and adapt the
review responsibilities to your organization.

Contributors should also read [`../CONTRIBUTING.md`](../CONTRIBUTING.md), which
covers environment setup, the development loop, code style, and the pull-request
mechanics referenced below.

## 1. Change Categories

The category of a change determines what review and documentation it needs.
"Maintainer review" means an approving review from a project maintainer; some
categories call for an additional reviewer with the relevant focus.

| Category | Examples | Required Review |
|---|---|---|
| **Compliance Logic** | Modification to any rule in `citi-evaluator.ts`, changes to `DeficiencyType`, changes to status determination logic | Maintainer review + a second reviewer familiar with the compliance rules |
| **DOM Selectors** | Updates to `selectors.ts`, new fallback strategies in `cayuse-scraper.ts` | Maintainer review |
| **Data Handling** | Changes to `storage.ts`, new data collected, new storage keys, anything that changes what is read from the page | Maintainer review + data-governance reviewer |
| **Notification Template** | Changes to `notification-renderer.ts`, the default template, or the set of mail-merge fields | Maintainer review |
| **UI Changes** | Side panel components, styles in `panel.css` | Maintainer review |
| **Permissions** | Any change to `manifest.json` `permissions` or `host_permissions` | Maintainer review + security reviewer |
| **Dependencies** | Adding/updating npm packages in `package.json` | Maintainer review + clean `npm audit` |
| **Governance Docs** | Changes to files in `governance/` | Maintainer review |

> **Notifications are local and deterministic.** They are rendered by an offline
> mail-merge template (`notification-renderer.ts`) — there is no model, API key,
> or network call involved. Earlier versions used a hosted LLM to draft
> notifications; that integration has been removed entirely. Treat the template
> as compliance-adjacent text and review wording changes accordingly.

## 2. Review Process

### 2.1 Standard Code Changes

1. Open or find an issue first for anything beyond a trivial fix, so the
   approach can be agreed before you invest time.
2. Create a feature branch from `main`.
3. Make changes with descriptive commits.
4. Open a pull request against `main`.
5. CI (`.github/workflows/ci.yml`) must pass: `npm run typecheck`, `npm test`,
   and `npm run build` all run on every push and pull request.
6. Obtain the review(s) required for the change category (see Section 1) — at
   least one approving maintainer review for all changes.
7. Merge into `main` once checks are green and review is complete.

See [`../CONTRIBUTING.md`](../CONTRIBUTING.md#pull-request-process) for the full
pull-request walkthrough, including branch naming and the local commands that
mirror CI.

### 2.2 Compliance Logic Changes

Any change to the compliance rules in `citi-evaluator.ts` **MUST** include:

- [ ] Written justification for the rule change (in the PR description)
- [ ] Updated documentation in [`01-architecture.md`](01-architecture.md)
      Section 5 (Compliance Evaluation Rules)
- [ ] A second reviewer familiar with the compliance rules signs off
- [ ] Test cases covering the changed behavior (the evaluator is unit-tested —
      see `tests/`)
- [ ] Review of `notification-renderer.ts` and the default template for any
      wording updates needed
- [ ] Review of `deficiency-report.ts` and `status-badge.ts` for new
      labels/colors

> The **dormant rules** (external-PDF and email-mismatch) are intentionally
> retained for future data sources and must not be removed. See
> [`01-architecture.md`](01-architecture.md) Section 5.1.

### 2.3 Permission Changes

Any addition to Chrome `permissions` or `host_permissions` in `manifest.json`
requires:

- [ ] Written justification added to [`04-security.md`](04-security.md) Section 2
- [ ] Risk assessment for the new permission
- [ ] Maintainer review approval
- [ ] Security reviewer approval

The extension currently requests only `sidePanel`, `storage`, `activeTab`,
`scripting`, and the single host permission `https://*.cayuse.com/*`. Broadening this
set — especially the host permission — is a significant change and should be
discussed in an issue first.

### 2.4 Data Handling Changes

Any change to what data is read, stored, or processed requires:

- [ ] Updated PII inventory in [`02-data-governance.md`](02-data-governance.md)
- [ ] Privacy impact assessment (the extension is offline and stores data only
      in `chrome.storage.local`; confirm the change preserves this)
- [ ] Updated [risk register](06-risk-register.md) if new risks are introduced
- [ ] Data-governance reviewer approval

## 3. Testing Requirements

### 3.1 Automated Checks (CI)

Every pull request runs the CI workflow (`.github/workflows/ci.yml`) on Node 20.
A change cannot merge unless all of the following pass:

1. [ ] Type check passes (`npm run typecheck`)
2. [ ] Unit tests pass (`npm test` → Vitest)
3. [ ] Build succeeds (`npm run build`)

You can — and should — run the exact same commands locally before pushing:

```bash
npm run typecheck
npm test
npm run build
```

The Vitest suites in `tests/` cover the compliance evaluator, date math,
institution detection, and the notification renderer, so much of the logic can
be exercised without a browser.

### 3.2 Manual Smoke Test (Cayuse)

There are no automated end-to-end tests against Cayuse, so any change that
touches scraping, selectors, or the UI also needs a manual pass before merge:

1. [ ] `npm run build` succeeds without errors
2. [ ] Extension loads in Chrome without error badges
3. [ ] Navigate to a Cayuse Human Ethics (IRB) submission form
       (`https://<tenant>.cayuse.com/...`)
4. [ ] "Scan Personnel" returns expected results
5. [ ] Compliance statuses match expected values
6. [ ] The home institution is detected correctly (or the Settings override
       applies, if configured)
7. [ ] "Generate Notification" produces a reasonable draft from the template
8. [ ] Settings save and load correctly
9. [ ] Extension works after a browser restart

Note in the PR description that you ran the manual smoke test and on what kind of
submission. See [`../CONTRIBUTING.md`](../CONTRIBUTING.md#loading-the-extension-for-manual-testing)
for the load-unpacked steps.

## 4. Release & Deployment Checklist

The repository ships releases as a packaged extension zip. The `package` script
(`npm run package`) builds `dist/` and produces a versioned artifact, and the
release workflow (`.github/workflows/release.yml`) creates a GitHub Release with
that artifact when a `v*` tag is pushed.

Before tagging a release:

1. [ ] All required PR reviews approved and merged to `main`
2. [ ] CI is green on `main` (`typecheck`, `test`, `build`)
3. [ ] Manual smoke test completed (Section 3.2)
4. [ ] Version bumped in `package.json` (the `prebuild` step runs
       `scripts/sync-version.mjs`, which copies the version into
       `manifest.json` automatically — keep them in sync; see Section 6)
5. [ ] [`CHANGELOG.md`](../CHANGELOG.md) updated with the notable changes
6. [ ] Governance docs updated if applicable (data handling, permissions, risks)
7. [ ] [Risk register](06-risk-register.md) reviewed for new or changed risks
8. [ ] `npm run package` produces the release zip locally without errors

To publish:

1. [ ] Tag the release (e.g. `git tag v1.0.1 && git push origin v1.0.1`)
2. [ ] The release workflow builds and attaches the zip to a new GitHub Release
3. [ ] Confirm the Release artifact and auto-generated notes look correct

For adopters loading the extension themselves: download the release zip (or
build from the tag), then load `dist/` unpacked per
[Runbook Procedure 1](08-runbook.md#procedure-1-build-and-deploy-the-extension).
After updating, do a post-deployment spot check — scan a known submission and
verify results.

## 5. Rollback Procedure

If a release introduces issues:

1. Retain the previous release artifact (or rebuild from the previous Git
   tag/commit).
2. On affected machines: open `chrome://extensions`, click the reload (↻) icon
   on the extension to reload from the previous `dist/`.
3. If the extension was replaced: remove it, then "Load unpacked" from the
   previous `dist/` directory.
4. Verify functionality on a known submission.
5. File a GitHub issue documenting the rollback cause so it can be fixed before
   the next release.

## 6. Version Numbering

The project follows [Semantic Versioning](https://semver.org/):

| Level | When to Bump | Examples |
|-------|-------------|---------|
| **MAJOR** (X.0.0) | Breaking changes to compliance logic, data model, or storage format | A new rule that changes how existing personnel are evaluated; a storage schema migration |
| **MINOR** (0.X.0) | New features, new compliance rules (additive), new UI capabilities | Adding a new deficiency type; adding export functionality |
| **PATCH** (0.0.X) | Bug fixes, selector updates, dependency updates, doc updates | Fixing a false-positive compliance status; updating selectors after a Cayuse change |

**Current version:** `1.0.0`

The version lives in `package.json`. The `prebuild` step runs
`scripts/sync-version.mjs`, which propagates that version into `manifest.json`
so the two never drift — bump `package.json` and let the build keep
`manifest.json` aligned.
