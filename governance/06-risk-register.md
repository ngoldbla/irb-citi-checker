# Risk Register

**Last Reviewed:** 2026-06-04

This register tracks risks for the IRB CITI Checker extension as of version 1.0.0.
The extension is **fully offline**: it makes zero network requests, contains no
AI/LLM integration, stores no API keys, and transmits no data to any external
service. Several risks present in earlier development builds have therefore been
eliminated and are recorded below as **Resolved** rather than deleted, so the
history of the mitigation is preserved.

The extension is **institution-neutral**. It runs at any institution via a single
broad host permission (`https://*.cayuse.com/*`) and auto-detects the home institution
from the Cayuse subdomain, with an optional manual override in Settings. For a
worked example of configuring and deploying the extension at a specific
institution, see [docs/DEPLOYMENT_EXAMPLE.md](../docs/DEPLOYMENT_EXAMPLE.md).

## Rating Scale

| Dimension | Low | Medium | High | Critical |
|---|---|---|---|---|
| **Likelihood** | Unlikely under normal use | Possible under certain conditions | Likely during regular use | Certain to occur |
| **Impact** | Minor inconvenience; no data exposure | Partial functionality loss; limited data exposure | Extension non-functional; significant data exposure | Credential compromise; regulatory violation; institutional risk |

**Severity** = Likelihood x Impact (highest applicable combination)

---

## Security Risks

### SEC-01: Plaintext API Key Storage

| Field | Value |
|---|---|
| **Category** | Security |
| **Description** | Earlier development builds proxied notification generation through a hosted AI gateway and stored that gateway's API key as plaintext in `chrome.storage.local`. As of 1.0.0 the AI gateway integration was removed entirely. The extension no longer has, requests, or stores any API key or credential of any kind. |
| **Likelihood** | N/A (no credential exists) |
| **Impact** | N/A |
| **Severity** | **Resolved** |
| **Current Mitigation** | The credential was eliminated, not merely protected: notification text is now produced by a deterministic local template (`src/lib/notification-renderer.ts`), so there is no secret to store. `chrome.storage.local` now holds only the current submission, scan history, and non-secret settings (institution name, home email domains, notification template). |
| **Recommended Mitigation** | None required. If a future feature reintroduces any credential, do not persist it in `chrome.storage.local`; prefer `chrome.storage.session` (memory-only) or institutional secret management. |
| **Owner** | Maintainers |
| **Status** | Resolved (1.0.0) |
| **References** | [Security 4.1](04-security.md#41-current-state), [Data Governance 2.4](02-data-governance.md#24-sensitive-data-in-storage) |

### SEC-02: PII Sent to Third-Party LLM Without Consent

| Field | Value |
|---|---|
| **Category** | Privacy / Compliance |
| **Description** | **Historical, now eliminated.** A pre-1.0.0 build generated notification emails by sending personnel PII (names, emails, roles, training records, deficiency details) to a hosted AI gateway that proxied to a third-party large language model. No consent dialog was shown to the operator, and data subjects were not notified. This was the most severe risk in the register. |
| **Likelihood** | N/A (the transmission path no longer exists) |
| **Impact** | N/A |
| **Severity** | **Resolved** (previously Critical) |
| **Current Mitigation** | The LLM integration was **removed entirely in 1.0.0**. Notifications are now rendered by a deterministic, editable local template with mail-merge fields (`{{piName}}`, `{{protocolNumber}}`, `{{submissionTitle}}`, `{{institutionName}}`, `{{date}}`, `{{deficiencies}}`) in `src/lib/notification-renderer.ts`. No model is involved and **no personnel data leaves the browser** — the extension makes zero network requests. Staff copy the rendered text and paste it into Cayuse themselves. Because there is no external transmission, there is no third-party data-sharing consent obligation arising from this feature. |
| **Recommended Mitigation** | None required. Closed. Any future feature that would transmit personnel data externally must re-open this risk and add (a) explicit operator consent disclosing what data is sent and to whom, (b) a data-processing agreement with the receiving service, and (c) data minimization. |
| **Owner** | Maintainers |
| **Status** | **Resolved / Closed (1.0.0)** |
| **References** | [Privacy 2.1](03-privacy-compliance.md#21-extension-operator-consent), [Data Governance 3.2](02-data-governance.md#32-external-transmission) |

### SEC-03: No Content Security Policy in Manifest

| Field | Value |
|---|---|
| **Category** | Security |
| **Description** | `manifest.json` does not define an explicit `content_security_policy`. Chrome Manifest V3 applies a restrictive default CSP that blocks inline scripts and `eval()`, but an explicit CSP would harden against future regressions if the manifest is modified. |
| **Likelihood** | Low |
| **Impact** | Medium (regression risk only) |
| **Severity** | **Low** |
| **Current Mitigation** | Manifest V3 default CSP is restrictive. No inline scripts in current code. With no external network calls, there is no `connect-src` surface to misconfigure. |
| **Recommended Mitigation** | Add an explicit `content_security_policy` to `manifest.json` matching or exceeding the Manifest V3 defaults. |
| **Owner** | Maintainers |
| **Status** | Open |
| **References** | [Security 3.3](04-security.md#33-known-gaps) |

### SEC-04: Overly Permissive Host Access

| Field | Value |
|---|---|
| **Category** | Security |
| **Description** | The extension declares a single broad host permission, `https://*.cayuse.com/*`, so that it works at any institution's Cayuse tenant without code changes. This grants the content script access to every page under `*.cayuse.com`, which is wider than any single institution strictly requires. |
| **Likelihood** | Low |
| **Impact** | Medium (broader DOM-read surface than the minimum; no credential or external endpoint is exposed because none exist) |
| **Severity** | **Low** |
| **Current Mitigation** | Cayuse is a single SaaS vendor and every tenant is hosted under `*.cayuse.com`, so the permission is scoped to that vendor and nothing else. The content script only reads the DOM of the active Cayuse submission page and never transmits what it reads. No `http://` traffic is used in practice (Cayuse is HTTPS-only). Institutions that want a tighter scope can repackage with a narrower host pattern (for example `*://your-tenant.cayuse.com/*`) — see [docs/DEPLOYMENT_EXAMPLE.md](../docs/DEPLOYMENT_EXAMPLE.md). |
| **Recommended Mitigation** | For single-institution deployments, narrow the host permission to the specific Cayuse subdomain before packaging. Document the chosen scope in the deployment record. |
| **Owner** | Maintainers / deploying institution |
| **Status** | Open (accepted for general distribution) |
| **References** | [Security 2 — Chrome Permissions Justification](04-security.md#2-chrome-permissions-justification) |

---

## Operational Risks

### OPS-01: Brittle DOM Scraping

| Field | Value |
|---|---|
| **Category** | Operational |
| **Description** | The extension depends on the specific Cayuse DOM structure (table components, assignment/role CSS classes, training modal structure). Cayuse is a third-party SaaS; any UI update could silently break scraping, producing zero results or incorrect partial results. |
| **Likelihood** | High (Cayuse updates are outside any deploying institution's control) |
| **Impact** | High (extension becomes non-functional; partial scraping could produce incorrect compliance results without any error) |
| **Severity** | **High** |
| **Current Mitigation** | Multiple fallback selector strategies in `cayuse-scraper.ts`. Console logging prefixed with `[IRB Checker]` for debugging. Selectors are centralized for easy updates. |
| **Recommended Mitigation** | (1) Add a DOM health check on page load that validates expected elements exist. (2) Surface warnings in the side panel when 0 personnel or 0 trainings are found. (3) Document the selector update procedure in the runbook. (4) Monitor Cayuse release notes where available. |
| **Owner** | Maintainers |
| **Status** | Open |
| **References** | [Operations 4](05-operations.md#4-cayuse-dom-change-handling), [Runbook](08-runbook.md) |

### OPS-02: Unbounded Submission History Growth

| Field | Value |
|---|---|
| **Category** | Operational / Data Governance |
| **Description** | `submissionHistory` in `chrome.storage.local` grows indefinitely (`src/lib/storage.ts`). Each scan appends the full personnel array (with all training records) to history. There is no TTL, no maximum entry count, and no cleanup mechanism. |
| **Likelihood** | High (grows with every scan) |
| **Impact** | Medium (eventual `chrome.storage.local` quota exhaustion at ~10MB; potential performance degradation on storage reads) |
| **Severity** | **Medium** |
| **Current Mitigation** | None. |
| **Recommended Mitigation** | (1) Implement a maximum number of history entries per submission (e.g., 10 most recent, FIFO eviction). (2) Add global age-based cleanup (e.g., delete entries older than 90 days). (3) Add a "Clear History" button in Settings. |
| **Owner** | Maintainers |
| **Status** | Open |
| **References** | [Data Governance 4.1](02-data-governance.md#41-current-state) |

### OPS-03: No Automated Tests for Compliance Logic

| Field | Value |
|---|---|
| **Category** | Quality |
| **Description** | Coverage of the compliance evaluation logic (`citi-evaluator.ts`) — which determines whether personnel are flagged as deficient — must be maintained as rules evolve. Gaps in coverage of edge cases (expiration boundaries, same-day completion / pending sync, external vs. home-institution classification) could allow regressions that produce wrong IRB-facing results. |
| **Likelihood** | Medium (bugs can be introduced during maintenance) |
| **Impact** | High (incorrect compliance evaluations could lead to wrong IRB decisions — either false positives blocking compliant researchers or false negatives allowing non-compliant submissions) |
| **Severity** | **High** |
| **Current Mitigation** | TypeScript strict mode catches type errors at compile time. Vitest test suite (`npm run test`) exercises the evaluator and notification renderer; CI runs typecheck and tests on every push. A manual testing checklist is documented in [Operations 7](05-operations.md#7-testing). |
| **Recommended Mitigation** | Maintain and expand unit tests for `citi-evaluator.ts` covering every rule plus edge cases, `date-utils.ts` for date calculations, `notification-renderer.ts` for template rendering and mail-merge expansion, and `storage.ts` with a mocked `chrome.storage`. |
| **Owner** | Maintainers |
| **Status** | Open |
| **References** | [Operations 7](05-operations.md#7-testing) |

### OPS-04: Fixed Timeouts in Scraper

| Field | Value |
|---|---|
| **Category** | Operational |
| **Description** | The modal-open timeout and inter-modal cycle delay are hardcoded constants in the content script. On slow networks, under high Cayuse server load, or with large numbers of personnel, these may be insufficient, causing training data to be missed and incorrectly flagged as missing. |
| **Likelihood** | Medium |
| **Impact** | Medium (missed training data leads to false `missing` or `expired` compliance status) |
| **Severity** | **Medium** |
| **Current Mitigation** | Console warnings are logged when timeouts occur. Fallback selectors are attempted before giving up. |
| **Recommended Mitigation** | (1) Make timeouts configurable in Settings (or auto-tune based on observed load times). (2) Add retry logic for modal operations that time out. (3) Surface timeout warnings prominently in the side panel. |
| **Owner** | Maintainers |
| **Status** | Open |

### OPS-05: No Audit Logging

| Field | Value |
|---|---|
| **Category** | Compliance |
| **Description** | There is no audit trail of who scanned which submission, when, or what results were obtained, and no logging of notification-generation events or settings changes. The `submissionHistory` provides partial scan history but contains no operator identity. |
| **Likelihood** | N/A (systemic gap) |
| **Impact** | Medium (an institution cannot demonstrate compliance-checking activity for its own records, or investigate how a particular result was reached) |
| **Severity** | **Medium** |
| **Current Mitigation** | `submissionHistory` captures scan timestamps and results, but not operator identity. Because the extension is offline and stores everything locally, all activity is already confined to the operator's own browser profile. |
| **Recommended Mitigation** | Add structured local audit-log entries for: scan initiated, scan completed (with result summary), notification generated (with target personnel), and settings changed, each with a timestamp. Keep this log in `chrome.storage.local` only, consistent with the offline design. |
| **Owner** | Maintainers / deploying institution |
| **Status** | Open |

---

## Code Quality Risks

### PRIV-01: escapeHtml Duplication

| Field | Value |
|---|---|
| **Category** | Security / Code Quality |
| **Description** | The `escapeHtml()` XSS-prevention function is independently defined in multiple side-panel component files rather than shared from a single utility module. A future component may forget to implement or import escaping, creating an XSS vulnerability when scraped Cayuse content is rendered. |
| **Likelihood** | Medium (likely to be missed during component additions) |
| **Impact** | Medium (XSS in the side panel if escaping is omitted) |
| **Severity** | **Medium** |
| **Current Mitigation** | All current components implement escaping correctly. The Manifest V3 default CSP limits the blast radius of any injection. |
| **Recommended Mitigation** | Extract `escapeHtml()` to a shared utility module (e.g., `src/lib/html-utils.ts`) and import it from all components. Add a lint rule or code-review checklist item for escaping any interpolated value. |
| **Owner** | Maintainers |
| **Status** | Open |
| **References** | [Security 3.3](04-security.md#33-known-gaps) |

---

## Resolved / Closed Risks Summary

| ID | Risk | Original Severity | Resolution |
|---|---|---|---|
| SEC-01 | Plaintext API key storage | High | Resolved in 1.0.0 — AI gateway removed; no credential exists. |
| SEC-02 | PII sent to third-party LLM without consent | **Critical** | **Resolved / Closed in 1.0.0** — LLM removed; notifications rendered by a deterministic local template; zero network requests. |

Risks recorded above as Resolved are retained for traceability and must be
re-opened if any future change reintroduces external network transmission or
stored credentials.
