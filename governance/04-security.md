# Security

**Last Reviewed:** 2026-03-04

## 1. Threat Model

### 1.1 Assets Under Protection

1. **Personnel PII** - names, emails, training records stored in `chrome.storage.local`
2. **Portkey API key** - credential enabling LLM API access (cost exposure + data access)
3. **IRB submission metadata** - protocol numbers, titles (institutional data)
4. **Extension integrity** - assurance that code has not been tampered with

### 1.2 Threat Actors

| Actor | Motivation | Capability | Relevant Assets |
|---|---|---|---|
| Malicious browser extension | Data theft | Cannot access this extension's `chrome.storage.local` (Chrome sandbox) | Low risk |
| Compromised Cayuse page (XSS) | Data injection | Could inject malicious DOM content that gets scraped as data | PII, extension integrity |
| Network attacker (MITM) | API key theft, PII interception | Mitigated by HTTPS for both Cayuse and Portkey API | API key, PII |
| Malicious Portkey endpoint | PII harvesting | User-configurable base URL with no allowlist validation | API key, PII |
| Physical device access | Data theft | Can read `chrome.storage.local` backing files on disk (unencrypted) | All assets |
| Insider (unauthorized extension user) | Unauthorized data access | Full extension access if they have the browser profile | All assets |

### 1.3 Attack Surface

| Surface | Description | Risk Level |
|---|---|---|
| Content script on Cayuse | Runs on 3 whitelisted domains; scrapes DOM data | Medium |
| Service worker message handler | Processes all inter-component messages; switches on `message.type` | Low |
| Side panel HTML rendering | Inserts scraped data into DOM | Medium (mitigated by escaping) |
| LLM client HTTP request | Outbound HTTPS to user-configured URL with Bearer token + PII payload | High |
| `chrome.storage.local` | Unencrypted persistent storage of PII and API key | Medium |

## 2. Chrome Permissions Justification

| Permission | Purpose | Risk Level | Justification |
|---|---|---|---|
| `storage` | Persist scan results, submission history, and user settings across browser sessions | Low | Required for any persistence. Sandboxed to this extension. |
| `activeTab` | Read the active tab's URL to verify the user is on a Cayuse domain before initiating a scan | Low | Only accesses URL, not page content. Used for domain validation. |
| `sidePanel` | Display compliance results in Chrome's side panel alongside the Cayuse page | Low | UI-only permission. No data access implications. |
| `scripting` | Programmatically inject content script into Cayuse tabs as a fallback when declarative injection fails | Medium | Scoped to `host_permissions` domains only. Cannot inject into arbitrary pages. Used by `ensureContentScript()` in `service-worker.ts`. |

**Host permissions:**

| Pattern | Domain | Purpose |
|---|---|---|
| `*://kennesaw-irb.cayuse.com/*` | Legacy KSU Cayuse | Content script injection + tab URL matching |
| `*://kennesaw.app.cayuse.com/*` | Current KSU Cayuse | Content script injection + tab URL matching |
| `*://kennesaw-irb.app.cayuse.com/*` | Alternate KSU Cayuse | Content script injection + tab URL matching |

**Permissions NOT requested:**
- `<all_urls>` - extension is scoped to 3 specific domains
- `tabs` (broad) - only `activeTab` is used (no access to all tab URLs)
- `webRequest` / `webRequestBlocking` - no network interception
- `cookies` - no cookie access
- `history` / `bookmarks` - no browser data access
- `downloads` - no file download capability

## 3. XSS Prevention

### 3.1 Escaping Implementation

The extension uses a DOM-based `escapeHtml()` function that creates a temporary `<div>`, sets `textContent` (auto-escapes), and reads `innerHTML`:

```typescript
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

This is a correct and reliable escaping approach.

### 3.2 Usage of escapeHtml()

| Component | File | What is escaped |
|---|---|---|
| `personnel-card.ts` | `src/sidepanel/components/personnel-card.ts` | `person.name`, `person.email`, training course names, dates, deficiency descriptions and recommendations |
| `notification-draft.ts` | `src/sidepanel/components/notification-draft.ts` | LLM-generated notification text |
| `submission-header.ts` | `src/sidepanel/components/submission-header.ts` | `submission.title`, `submission.protocolNumber` |

### 3.3 Known Gaps

- **Code duplication:** `escapeHtml()` is independently defined in 3 separate files rather than shared from a utility module. Future components may forget to implement or import escaping. See [Risk Register PRIV-01](06-risk-register.md#priv-01-escapehtml-duplication).
- **Safe-by-construction values:** `status-badge.ts` inserts the `overallStatus` string into a CSS class attribute. This is safe because the value comes from the `CitiStatus` TypeScript union type, not from user input. Similarly, `deficiency-report.ts` uses `TYPE_LABELS` and `TYPE_COLORS` lookup tables that map from code-defined values.
- **No explicit CSP:** The `manifest.json` does not define a `content_security_policy`. Chrome Manifest v3 applies a restrictive default CSP that blocks inline scripts and `eval()`, providing baseline protection. An explicit CSP should be added to prevent regressions. See [Risk Register SEC-03](06-risk-register.md#sec-03-no-content-security-policy-in-manifest).

## 4. Credential Handling

### 4.1 Current State

| Aspect | Implementation |
|---|---|
| **Storage** | Plaintext in `chrome.storage.local` under key `settings.portkeyApiKey` |
| **UI input** | `<input type="password">` in settings modal (masked on screen but stored as plaintext) |
| **Transmission** | `Authorization: Bearer <key>` header over HTTPS |
| **Validation** | None - empty or malformed keys are stored without error |
| **Rotation** | No mechanism - user must manually update in settings |
| **Logging** | API key is never logged to console |

### 4.2 Risks

1. **Plaintext storage:** Anyone with physical device access or access to the browser's backing storage files can extract the key. See [Risk Register SEC-01](06-risk-register.md#sec-01-plaintext-api-key-storage).
2. **No URL allowlist:** The `portkeyBaseUrl` setting is user-configurable with only HTML `type="url"` validation. A malicious or misconfigured URL could receive the API key and PII. See [Risk Register SEC-04](06-risk-register.md#sec-04-no-validation-on-portkey-base-url).
3. **No key rotation:** No automated or prompted key rotation mechanism.
4. **No compromise detection:** No way to detect if a key has been compromised.

### 4.3 Recommended Mitigations

1. Migrate API key to `chrome.storage.session` (Manifest v3: memory-only, cleared on browser close, never persisted to disk)
2. Validate `portkeyBaseUrl` against an allowlist of approved Portkey/institutional endpoints
3. Add a "Test Connection" button that validates the API key without sending PII
4. Add a key validation check on save (non-empty, reasonable length)

## 5. Message Validation

### 5.1 Current Implementation

- Service worker (`service-worker.ts` line 31-58): Switches on `message.type` string. Returns `{ type: 'SCAN_ERROR', error: 'Unknown message type' }` for unrecognized types.
- Content script: Checks for `PING` and `REQUEST_SCRAPE` message types only.
- TypeScript union types (`ExtensionMessage`) enforce message shapes at compile time but not at runtime.

### 5.2 Assessment

- **Risk is low.** Chrome's extension message passing restricts message senders to the extension's own contexts (service worker, content scripts, side panel). External web pages cannot send messages to the extension unless the extension explicitly listens via `chrome.runtime.onMessageExternal` (it does not).
- No schema validation on message payloads at runtime. TypeScript types provide compile-time safety only.
- No arbitrary code execution paths from message handling.

## 6. Input Validation Gaps

| Input | Current Validation | Gap | Risk |
|---|---|---|---|
| Portkey base URL | HTML `<input type="url">` only | No runtime allowlist check. URL could point to any HTTPS endpoint. | High - API key + PII exfiltration |
| Portkey API key | None | No format or length validation | Low - invalid key simply fails API call |
| LLM model name | Falls back to `'gpt-5.2'` if empty | Arbitrary string accepted | Low - invalid model simply fails API call |
| Scraped DOM data | Structural checks (cell count >= 5, name not empty) | No sanitization of scraped text before storage or LLM transmission | Low - text is escaped before rendering; LLM treats as plaintext |
| LLM response | Checks for non-empty `choices[0].message.content` | Response is HTML-escaped before rendering | Low |

## 7. Known Vulnerabilities

Cross-referenced to the [Risk Register](06-risk-register.md):

| ID | Summary | Severity |
|---|---|---|
| [SEC-01](06-risk-register.md#sec-01-plaintext-api-key-storage) | Plaintext API key storage in `chrome.storage.local` | High |
| [SEC-02](06-risk-register.md#sec-02-pii-sent-to-third-party-llm-without-consent) | PII transmitted to third-party LLM without explicit consent | Critical |
| [SEC-03](06-risk-register.md#sec-03-no-content-security-policy-in-manifest) | No Content Security Policy in manifest.json | Low |
| [SEC-04](06-risk-register.md#sec-04-no-validation-on-portkey-base-url) | No validation/allowlist on Portkey base URL | High |
| [SEC-05](06-risk-register.md#sec-05-no-rate-limiting-on-llm-api-calls) | No rate limiting on LLM API calls | Medium |
