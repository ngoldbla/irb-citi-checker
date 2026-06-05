# Security

**Last Reviewed:** 2026-06-04

> **Architecture note.** This extension is **fully offline**. It makes **zero
> network requests** and contains **no AI/LLM integration, no API keys, and no
> external services**. (Earlier prototypes generated notification drafts via a
> hosted LLM; that path has been removed entirely.) Notifications are produced
> by a deterministic, editable local template, and the only data store is
> `chrome.storage.local`, which never leaves the browser. This dramatically
> shrinks the threat surface relative to a networked design — there are no
> outbound credentials to steal and no third-party endpoint to compromise.

## 1. Threat Model

### 1.1 Assets Under Protection

1. **Personnel PII** — names, emails, and CITI training records stored in
   `chrome.storage.local`.
2. **IRB submission metadata** — protocol numbers and titles (institutional
   data) scraped from the active Cayuse page.
3. **Extension integrity** — assurance that the loaded extension code has not
   been tampered with.

There are **no credentials or secrets** to protect: the extension stores no API
keys, tokens, or passwords, and transmits nothing off-device.

### 1.2 Threat Actors

| Actor | Motivation | Capability | Relevant Assets |
|---|---|---|---|
| Malicious browser extension | Data theft | Cannot read this extension's `chrome.storage.local` (Chrome per-extension sandbox) | Low risk |
| Compromised Cayuse page (XSS) | Data injection | Could inject malicious DOM content that is scraped and later rendered in the side panel | PII, extension integrity |
| Physical device access | Data theft | Can read the `chrome.storage.local` backing files on disk (unencrypted at rest) | PII, submission metadata |
| Insider (unauthorized extension user) | Unauthorized data access | Full extension access if they have the browser profile | PII, submission metadata |

> A **network attacker (MITM)** has no extension-specific asset to target: the
> extension performs no outbound requests. The only network traffic in scope is
> the browser's own HTTPS connection to Cayuse, which is outside this
> extension's trust boundary and is protected by TLS in the normal way.

### 1.3 Attack Surface

| Surface | Description | Risk Level |
|---|---|---|
| Content script on Cayuse | Runs on any `*.cayuse.com` tenant; scrapes DOM data | Medium |
| Service worker message handler | Processes inter-component messages; switches on `message.type` | Low |
| Side panel HTML rendering | Inserts scraped data into the DOM | Medium (mitigated by escaping) |
| `chrome.storage.local` | Unencrypted persistent storage of PII and submission metadata | Medium |

There is **no outbound HTTP surface**: with the LLM client removed, the
previously high-risk "outbound HTTPS with Bearer token + PII payload" surface no
longer exists.

## 2. Chrome Permissions Justification

| Permission | Purpose | Risk Level | Justification |
|---|---|---|---|
| `storage` | Persist scan results, submission history, and user settings across browser sessions | Low | Required for any persistence. Sandboxed to this extension. |
| `activeTab` | Read the active tab's URL to verify the user is on a Cayuse page before initiating a scan | Low | Only accesses the URL, not page content. Used for host validation. |
| `sidePanel` | Display compliance results in Chrome's side panel alongside the Cayuse page | Low | UI-only permission. No data access implications. |
| `scripting` | Programmatically inject the content script into Cayuse tabs as a fallback when declarative injection fails | Medium | Scoped to `host_permissions` only. Cannot inject into arbitrary pages. Used by `ensureContentScript()` in `service-worker.ts`. |

**Host permissions:**

| Pattern | Scope | Purpose |
|---|---|---|
| `https://*.cayuse.com/*` | Any Cayuse tenant | Content script injection + tab URL matching |

**Why a single broad `*.cayuse.com` pattern?** Cayuse is a multi-tenant SaaS
product: every customer institution is served from a subdomain of
`cayuse.com` (for example, `your-institution-irb.cayuse.com` or
`your-institution.app.cayuse.com`), and tenant subdomains vary by institution
and can change over time. A single broad host permission is what makes the
extension **institution-neutral** — it works at any institution's Cayuse
instance without a per-site rebuild or a hardcoded domain list. The home
institution is **auto-detected from the Cayuse subdomain** at runtime (see
`src/lib/institution.ts`), with an optional manual override in Settings.

This trade-off is deliberate. The broad pattern grants the content script
access to all `*.cayuse.com` pages the user visits, but the extension only acts
on demand (the user clicks "Scan"), only reads DOM data relevant to IRB
personnel/training, and **never transmits** what it reads. The permission is
still tightly bounded to a single vendor's domain — it is not `<all_urls>`. See
[`docs/DEPLOYMENT_EXAMPLE.md`](../docs/DEPLOYMENT_EXAMPLE.md) for a worked
example of how an institution can document and, if its policy requires, further
narrow this scope at install time.

**Permissions NOT requested:**

- `<all_urls>` — extension is scoped to a single vendor domain (`*.cayuse.com`).
- `tabs` (broad) — only `activeTab` is used (no access to all tab URLs).
- `webRequest` / `webRequestBlocking` — no network interception.
- `cookies` — no cookie access.
- `history` / `bookmarks` — no browser data access.
- `downloads` — no file download capability.

The extension also declares **no `externally_connectable`** and makes **no
`fetch`/`XMLHttpRequest` calls**, so it cannot exfiltrate data even if compromised.

## 3. XSS Prevention

### 3.1 Escaping Implementation

The extension uses a DOM-based `escapeHtml()` function that creates a temporary
`<div>`, sets `textContent` (which auto-escapes), and reads back `innerHTML`:

```typescript
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

This is a correct and reliable escaping approach. It is the primary defense
against the highest-likelihood injection vector: a compromised or malicious
Cayuse page placing hostile markup in DOM nodes that the content script scrapes
and the side panel later renders.

### 3.2 Usage of escapeHtml()

| Component | File | What is escaped |
|---|---|---|
| `personnel-card.ts` | `src/sidepanel/components/personnel-card.ts` | `person.name`, `person.email`, training course names, dates, deficiency descriptions and recommendations |
| `notification-draft.ts` | `src/sidepanel/components/notification-draft.ts` | Rendered notification text (deterministic template output) before display in the editable textarea |
| `submission-header.ts` | `src/sidepanel/components/submission-header.ts` | `submission.title`, `submission.protocolNumber` |
| `scan-progress.ts` | `src/sidepanel/components/scan-progress.ts` | Per-person progress labels emitted during scanning |

All values surfaced in the side panel originate either from scraped Cayuse DOM
or from the deterministic notification template — both of which are treated as
untrusted text and escaped before rendering.

### 3.3 Known Gaps

- **Code duplication:** `escapeHtml()` is independently defined in several
  component files rather than shared from a single utility module. Future
  components may forget to implement or import escaping. See
  [Risk Register PRIV-01](06-risk-register.md#priv-01-escapehtml-duplication).
- **Safe-by-construction values:** `status-badge.ts` inserts the `overallStatus`
  string into a CSS class attribute. This is safe because the value comes from
  the `CitiStatus` TypeScript union type, not from user input. Similarly,
  `deficiency-report.ts` uses `TYPE_LABELS` and `TYPE_COLORS` lookup tables that
  map from code-defined values only.
- **Explicit CSP in place:** `manifest.json` defines a
  `content_security_policy` of `script-src 'self'; object-src 'self'` for
  extension pages, which blocks inline scripts and `eval()`. This complements
  the restrictive Manifest v3 default and guards against regressions if the
  manifest is later modified.

## 4. Data-at-Rest Handling

### 4.1 Current State

The extension stores only the following in `chrome.storage.local`:

| Key | Contents |
|---|---|
| `currentSubmission` | Most recent scan result (personnel + training + compliance) |
| `submissionHistory` | Append-only per-submission scan history |
| `settings` | `institutionName`, `institutionEmailDomains`, `notificationTemplate` |

| Aspect | Implementation |
|---|---|
| **Secrets stored** | None — no API keys, tokens, or passwords exist anywhere in the extension |
| **Encryption at rest** | None — `chrome.storage.local` is plaintext on disk (Chrome default) |
| **Scope** | Per-extension sandbox; other extensions cannot read it |
| **Transmission** | None — data is never sent off-device |

### 4.2 Risks

1. **Plaintext PII at rest:** Anyone with physical device access or access to
   the browser's backing storage files can read stored personnel PII and
   submission metadata. See
   [Risk Register OPS-02](06-risk-register.md#ops-02-unbounded-submission-history-growth)
   for the related retention/growth concern.
2. **No secrets to compromise:** With the LLM client and its API key removed,
   the former "credential theft" and "API key exfiltration to an attacker-
   controlled endpoint" risks no longer apply.

### 4.3 Recommended Mitigations

1. Apply data minimization and retention limits to `submissionHistory` so that
   PII does not accumulate on disk indefinitely (FIFO/TTL eviction; a "Clear
   History" control in Settings).
2. Treat the browser profile as the security boundary: rely on OS-level disk
   encryption and standard endpoint controls for data-at-rest protection. See
   [`docs/DEPLOYMENT_EXAMPLE.md`](../docs/DEPLOYMENT_EXAMPLE.md) for an example
   of how an institution can document these expectations for staff machines.

## 5. Message Validation

### 5.1 Current Implementation

- Service worker (`service-worker.ts`): switches on `message.type` and returns
  `{ type: 'SCAN_ERROR', error: 'Unknown message type' }` for unrecognized
  types.
- Content script: responds to `PING` and `REQUEST_SCRAPE` (and `REQUEST_NAVIGATE`
  for the stubbed return-to-PI flow) only.
- TypeScript union types (`ExtensionMessage` in `src/types/messages.ts`) enforce
  message shapes at compile time but not at runtime.

### 5.2 Assessment

- **Risk is low.** Chrome's extension message passing restricts senders to the
  extension's own contexts (service worker, content scripts, side panel).
  External web pages cannot send messages to the extension unless it explicitly
  listens via `chrome.runtime.onMessageExternal` — **it does not**, and it
  declares no `externally_connectable`.
- No runtime schema validation on message payloads; TypeScript types provide
  compile-time safety only.
- No arbitrary-code-execution paths exist in message handling. The
  return-to-PI navigation is an intentional, documented **stub**
  (`src/content/cayuse-navigator.ts`) that performs no Cayuse UI automation.

## 6. Input Validation Gaps

| Input | Current Validation | Gap | Risk |
|---|---|---|---|
| Scraped DOM data | Structural checks (cell count, non-empty name) | No sanitization of scraped text before storage | Low — text is HTML-escaped before rendering (Section 3) |
| Institution override (name, email domains) | Trimmed/normalized in `institution.ts` | Free-text accepted; only affects local classification heuristics | Low — never transmitted; only narrows/loosens home-institution matching |
| Notification template | None (free-text) | Arbitrary template body accepted | Low — rendered output is escaped before display; placeholders are a fixed allowlist (`{{piName}}`, `{{protocolNumber}}`, `{{submissionTitle}}`, `{{institutionName}}`, `{{date}}`, `{{deficiencies}}`); unknown placeholders are left intact rather than executed |

There are no URL, API-key, or model-name inputs to validate — those settings no
longer exist.

## 7. Known Vulnerabilities

Cross-referenced to the [Risk Register](06-risk-register.md). The former
LLM-dependent security risks (plaintext API key storage, PII transmission to a
third-party LLM, base-URL allowlist, and LLM rate limiting) have been **retired
by removing the network/LLM integration entirely** and are no longer applicable.

| ID | Summary | Severity |
|---|---|---|
| [PRIV-01](06-risk-register.md#priv-01-escapehtml-duplication) | `escapeHtml()` duplicated across components (XSS regression risk) | Medium |
| [OPS-02](06-risk-register.md#ops-02-unbounded-submission-history-growth) | Unbounded submission history growth (PII accumulation at rest) | Medium |

For the full, current set of operational and code-quality risks, see the
[Risk Register](06-risk-register.md).
