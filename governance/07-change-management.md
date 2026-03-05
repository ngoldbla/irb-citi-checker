# Change Management

**Last Reviewed:** 2026-03-04

## 1. Change Categories

| Category | Examples | Required Reviewers |
|---|---|---|
| **Compliance Logic** | Modification to any rule in `citi-evaluator.ts`, changes to `DeficiencyType`, changes to status determination logic | IRB Office + Developer peer review |
| **DOM Selectors** | Updates to `selectors.ts`, new fallback strategies in `cayuse-scraper.ts` | Developer peer review |
| **Data Handling** | Changes to `storage.ts`, new data collected, changes to what is sent to LLM, new storage keys | Governance review + Developer peer review |
| **LLM Integration** | Changes to `llm-client.ts`, `notification-templates.ts`, new LLM features | Governance review + Developer peer review |
| **UI Changes** | Side panel components, styles in `panel.css` | Developer peer review |
| **Permissions** | Any change to `manifest.json` permissions or host_permissions | Governance review + Security review + Developer peer review |
| **Dependencies** | Adding/updating npm packages in `package.json` | Developer peer review + `npm audit` |
| **Governance Docs** | Changes to files in `governance/` | Governance review |

## 2. Review Process

### 2.1 Standard Code Changes

1. Create a feature branch from `main`
2. Make changes with descriptive commits
3. Open a pull request against `main`
4. Assign required reviewers based on change category (see table above)
5. All CI checks must pass (`npm run typecheck` at minimum; tests when available)
6. At least one approving review from each required reviewer category
7. Squash merge into `main`

### 2.2 Compliance Logic Changes

Any change to the 6 compliance rules in `citi-evaluator.ts` **MUST** include:

- [ ] Written justification for the rule change (in the PR description)
- [ ] Updated documentation in `governance/01-architecture.md` Section 5
- [ ] Explicit sign-off from the IRB Office
- [ ] Test cases covering the changed behavior (when test infrastructure exists)
- [ ] Review of `notification-templates.ts` for any prompt updates needed
- [ ] Review of `deficiency-report.ts` and `status-badge.ts` for new labels/colors

### 2.3 Permission Changes

Any addition to Chrome `permissions` or `host_permissions` in `manifest.json` requires:

- [ ] Written justification added to `governance/04-security.md` Section 2
- [ ] Risk assessment for the new permission
- [ ] Governance review approval
- [ ] Security review approval

### 2.4 Data Handling Changes

Any change to what data is collected, stored, or transmitted requires:

- [ ] Updated PII inventory in `governance/02-data-governance.md`
- [ ] Privacy impact assessment (does this change third-party data exposure?)
- [ ] Updated risk register if new risks are introduced
- [ ] Governance review approval

## 3. Testing Requirements

### 3.1 Current State (Manual)

All changes must pass this manual testing checklist before merge:

1. [ ] `npm run build` succeeds without errors
2. [ ] `npm run typecheck` passes
3. [ ] Extension loads in Chrome without error badges
4. [ ] Navigate to a Cayuse submission form
5. [ ] "Scan Personnel" returns expected results
6. [ ] Compliance statuses match expected values
7. [ ] "Generate Notification" produces a reasonable draft (if LLM changes)
8. [ ] Settings save and load correctly
9. [ ] Extension works after browser restart

### 3.2 Target State (Automated)

When test infrastructure is established:

1. [ ] All unit tests pass (`npm run test`)
2. [ ] Type check passes (`npm run typecheck`)
3. [ ] Build succeeds (`npm run build`)
4. [ ] No new `npm audit` vulnerabilities at `high` or `critical` level
5. [ ] Manual smoke test on a known Cayuse submission

## 4. Deployment Checklist

Before deploying a new version to any machine:

1. [ ] All PR reviews approved
2. [ ] `npm run build` succeeds
3. [ ] `npm run typecheck` passes
4. [ ] Manual testing completed (Section 3.1)
5. [ ] Version bumped in **both** `package.json` and `manifest.json`
6. [ ] Governance docs updated if applicable (data handling, permissions, risks)
7. [ ] Risk register reviewed for new or changed risks
8. [ ] Built `dist/` folder distributed to authorized machines
9. [ ] Extension reloaded on target browsers (see [Runbook Procedure 1](08-runbook.md#procedure-1-build-and-deploy-the-extension))
10. [ ] Post-deployment spot check: scan a known submission and verify results

## 5. Rollback Procedure

If a deployment introduces issues:

1. Retain previous `dist/` build artifacts (or rebuild from the previous Git tag/commit)
2. On affected machines: open `chrome://extensions`, click the refresh icon on the extension to reload from the previous `dist/`
3. If the extension was replaced: remove it, then "Load unpacked" from the previous `dist/` directory
4. Verify functionality on a known submission
5. File an issue documenting the rollback cause

## 6. Version Numbering

Follow [Semantic Versioning](https://semver.org/):

| Level | When to Bump | Examples |
|-------|-------------|---------|
| **MAJOR** (X.0.0) | Breaking changes to compliance logic, data model, or storage format | New rule that changes how existing personnel are evaluated; storage schema migration |
| **MINOR** (0.X.0) | New features, new compliance rules (additive), new UI capabilities | Adding a new deficiency type; adding export functionality |
| **PATCH** (0.0.X) | Bug fixes, selector updates, dependency updates, doc updates | Fixing a false-positive compliance status; updating selectors after Cayuse change |

**Current version:** `0.1.0` (pre-release / internal use)

Version must be updated in both:
- `package.json` (`"version"` field)
- `manifest.json` (`"version"` field)
