# Risk Register

**Last Reviewed:** 2026-03-04

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
| **Description** | Portkey API key stored as plaintext in `chrome.storage.local` (`src/lib/storage.ts` line 67). Readable by anyone with physical device access or ability to read the browser's LevelDB backing store files on disk. |
| **Likelihood** | Medium |
| **Impact** | High (credential compromise leads to unauthorized API usage and potential cost exposure on the Portkey/OpenAI account) |
| **Severity** | **High** |
| **Current Mitigation** | `chrome.storage.local` is sandboxed per-extension (other extensions cannot read it). `<input type="password">` masks key in the UI. |
| **Recommended Mitigation** | Migrate to `chrome.storage.session` (Manifest v3: memory-only, cleared on browser close, never persisted to disk). Alternatively, integrate with KSU's credential management infrastructure. |
| **Owner** | TBD (Developer) |
| **Status** | Open |
| **References** | [Security 4.1](04-security.md#41-current-state), [Data Governance 2.4](02-data-governance.md#24-sensitive-data-in-storage) |

### SEC-02: PII Sent to Third-Party LLM Without Consent

| Field | Value |
|---|---|
| **Category** | Privacy / Compliance |
| **Description** | When generating notification emails, personnel PII (names, emails, roles, training records, deficiency details) is sent to the Portkey API endpoint, which proxies to OpenAI. No consent dialog is shown to the extension operator, and data subjects (personnel on the submission) are not notified. Triggered every time the "Generate Notification" button is clicked. |
| **Likelihood** | High (occurs on every notification generation) |
| **Impact** | High (potential FERPA/privacy violation, institutional policy violation, PII exposure to third-party AI service) |
| **Severity** | **Critical** |
| **Current Mitigation** | None. User must actively click "Generate Notification" but is not warned about data transmission. |
| **Recommended Mitigation** | (1) Add a confirmation dialog before LLM calls disclosing what data will be sent and to which service. (2) Verify KSU has an appropriate DPA with Portkey/OpenAI. (3) Implement data minimization in prompts (see [Privacy 5](03-privacy-compliance.md#5-data-minimization-assessment)). (4) Consider an institutional API endpoint that strips PII before LLM processing. |
| **Owner** | TBD (Governance) |
| **Status** | Open |
| **References** | [Privacy 2.1](03-privacy-compliance.md#21-extension-operator-consent), [Privacy 3.1](03-privacy-compliance.md#31-portkey--openai), [Data Governance 3.2](02-data-governance.md#32-external-transmission) |

### SEC-03: No Content Security Policy in Manifest

| Field | Value |
|---|---|
| **Category** | Security |
| **Description** | `manifest.json` does not define a `content_security_policy`. Chrome Manifest v3 applies a restrictive default CSP that blocks inline scripts and `eval()`, but an explicit CSP would prevent future regressions if the manifest is modified. |
| **Likelihood** | Low |
| **Impact** | Medium (regression risk only) |
| **Severity** | **Low** |
| **Current Mitigation** | Manifest v3 default CSP is restrictive. No inline scripts in current code. |
| **Recommended Mitigation** | Add explicit `content_security_policy` to `manifest.json` matching or exceeding the Manifest v3 defaults. |
| **Owner** | TBD (Developer) |
| **Status** | Open |
| **References** | [Security 3.3](04-security.md#33-known-gaps) |

### SEC-04: No Validation on Portkey Base URL

| Field | Value |
|---|---|
| **Category** | Security |
| **Description** | The `portkeyBaseUrl` setting is user-configurable with only HTML `<input type="url">` validation. There is no runtime allowlist check. A malicious or misconfigured URL could receive the API key (sent as Bearer token in the Authorization header) and any PII included in LLM prompts. |
| **Likelihood** | Low (requires social engineering or misconfiguration) |
| **Impact** | Critical (API key exfiltration + full PII exposure to attacker-controlled server) |
| **Severity** | **High** |
| **Current Mitigation** | None. Any HTTPS URL is accepted. |
| **Recommended Mitigation** | Validate `portkeyBaseUrl` against an allowlist of approved Portkey/institutional endpoints at save time. Display a warning for non-allowlisted URLs. |
| **Owner** | TBD (Developer) |
| **Status** | Open |
| **References** | [Security 4.2](04-security.md#42-risks), [Security 6](04-security.md#6-input-validation-gaps) |

### SEC-05: No Rate Limiting on LLM API Calls

| Field | Value |
|---|---|
| **Category** | Operational / Security |
| **Description** | No client-side rate limiting on `chatCompletion()` calls in `llm-client.ts`. Rapid repeated clicks on "Generate Notification" after each response returns could exhaust API quota or incur unexpected costs. |
| **Likelihood** | Medium |
| **Impact** | Medium (cost exposure, API quota exhaustion) |
| **Severity** | **Medium** |
| **Current Mitigation** | UI shows a loading overlay during generation which prevents double-click, but does not prevent rapid sequential clicks after each response returns. |
| **Recommended Mitigation** | Add client-side debounce/cooldown on the Generate Notification button (e.g., 30-second cooldown). Cache recent drafts per submission to avoid redundant API calls. |
| **Owner** | TBD (Developer) |
| **Status** | Open |

---

## Operational Risks

### OPS-01: Brittle DOM Scraping

| Field | Value |
|---|---|
| **Category** | Operational |
| **Description** | Extension depends on specific Cayuse DOM structure (Semantic UI `e3-table` components, `assignment-type-*` CSS classes, Bootstrap modal structure). Cayuse is a third-party SaaS; any UI update could silently break scraping, producing zero results or incorrect partial results. |
| **Likelihood** | High (Cayuse updates are outside KSU's control) |
| **Impact** | High (extension becomes non-functional; partial scraping could produce incorrect compliance results without any error) |
| **Severity** | **High** |
| **Current Mitigation** | Multiple fallback selector strategies in `cayuse-scraper.ts`. Console logging prefixed with `[IRB Checker]` for debugging. Centralized selectors in `selectors.ts` for easy updates. |
| **Recommended Mitigation** | (1) Add DOM health check on page load that validates expected elements exist. (2) Surface warnings in side panel when 0 personnel or 0 trainings are found. (3) Document selector update procedure in runbook. (4) Monitor Cayuse release notes if available. |
| **Owner** | TBD (SRE) |
| **Status** | Open |
| **References** | [Operations 4](05-operations.md#4-cayuse-dom-change-handling), [Runbook Procedure 2-3](08-runbook.md) |

### OPS-02: Unbounded Submission History Growth

| Field | Value |
|---|---|
| **Category** | Operational / Data Governance |
| **Description** | `submissionHistory` in `chrome.storage.local` grows indefinitely (`src/lib/storage.ts` lines 20-29). Each scan appends the full personnel array (with all training records) to history. No TTL, no maximum entries, no cleanup mechanism. |
| **Likelihood** | High (grows with every scan) |
| **Impact** | Medium (eventual `chrome.storage.local` quota exhaustion at 10MB; potential performance degradation on storage reads) |
| **Severity** | **Medium** |
| **Current Mitigation** | None. |
| **Recommended Mitigation** | (1) Implement max history entries per submission (e.g., 10 most recent, FIFO eviction). (2) Add global age-based cleanup (e.g., delete entries older than 90 days). (3) Add "Clear History" button in settings. |
| **Owner** | TBD (Developer) |
| **Status** | Open |
| **References** | [Data Governance 4.1](02-data-governance.md#41-current-state) |

### OPS-03: No Automated Tests

| Field | Value |
|---|---|
| **Category** | Quality |
| **Description** | No unit tests, integration tests, or end-to-end tests exist. The compliance evaluation logic (`citi-evaluator.ts`) - which determines whether personnel are flagged as deficient - is entirely untested. |
| **Likelihood** | High (bugs will be introduced during maintenance) |
| **Impact** | High (incorrect compliance evaluations could lead to wrong IRB decisions - either false positives blocking compliant researchers or false negatives allowing non-compliant submissions) |
| **Severity** | **High** |
| **Current Mitigation** | TypeScript strict mode catches type errors at compile time. Manual testing checklist in [Operations 7.2](05-operations.md#72-manual-testing-checklist). |
| **Recommended Mitigation** | Add unit tests for `citi-evaluator.ts` covering all 6 rules + edge cases, `date-utils.ts` for date calculations, and `storage.ts` with mocked `chrome.storage`. |
| **Owner** | TBD (Developer) |
| **Status** | Open |
| **References** | [Operations 7](05-operations.md#7-testing) |

### OPS-04: Fixed Timeouts in Scraper

| Field | Value |
|---|---|
| **Category** | Operational |
| **Description** | `MODAL_TIMEOUT` (5000ms) and `MODAL_CYCLE_DELAY` (300ms) are hardcoded constants in the content script. On slow networks, under high Cayuse server load, or with large numbers of personnel, these may be insufficient, causing training data to be missed and incorrectly flagged as missing. |
| **Likelihood** | Medium |
| **Impact** | Medium (missed training data leads to false `missing` or `expired` compliance status) |
| **Severity** | **Medium** |
| **Current Mitigation** | Console warnings logged when timeouts occur. Fallback selectors attempted before giving up. |
| **Recommended Mitigation** | (1) Make timeouts configurable in settings (or auto-tune based on observed load times). (2) Add retry logic for modal operations that timeout. (3) Surface timeout warnings prominently in the side panel. |
| **Owner** | TBD (Developer) |
| **Status** | Open |

### OPS-05: No Audit Logging

| Field | Value |
|---|---|
| **Category** | Compliance |
| **Description** | No audit trail of who scanned which submission, when, or what results were obtained. No logging of LLM API calls, notification generation events, or settings changes. The `submissionHistory` provides partial scan history but contains no user identity or LLM call records. |
| **Likelihood** | N/A (systemic gap) |
| **Impact** | Medium (cannot demonstrate compliance-checking activity for audits; cannot investigate inappropriate data access) |
| **Severity** | **Medium** |
| **Current Mitigation** | `submissionHistory` captures scan timestamps and results, but not user identity or LLM activity. |
| **Recommended Mitigation** | Add structured audit log entries for: scan initiated, scan completed (with result summary), notification generated (with target personnel), settings changed. Include timestamp. |
| **Owner** | TBD (Governance) |
| **Status** | Open |

---

## Code Quality Risks

### PRIV-01: escapeHtml Duplication

| Field | Value |
|---|---|
| **Category** | Security / Code Quality |
| **Description** | The `escapeHtml()` XSS prevention function is independently defined in 3 separate files (`personnel-card.ts`, `notification-draft.ts`, `submission-header.ts`) rather than shared from a utility module. Future components may forget to implement or import escaping, creating an XSS vulnerability. |
| **Likelihood** | Medium (likely to be missed during component additions) |
| **Impact** | Medium (XSS vulnerability in the side panel if escaping is omitted) |
| **Severity** | **Medium** |
| **Current Mitigation** | All current components implement escaping correctly. |
| **Recommended Mitigation** | Extract `escapeHtml()` to a shared utility module (e.g., `src/lib/html-utils.ts`) and import from all components. Add a linting rule or code review checklist item for escaping. |
| **Owner** | TBD (Developer) |
| **Status** | Open |
| **References** | [Security 3.3](04-security.md#33-known-gaps) |
