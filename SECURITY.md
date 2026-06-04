# Security Policy

Thanks for helping keep **IRB CITI Checker** and its users safe. This document
explains which versions we support, how to report a vulnerability privately, and
the security posture you can expect from the extension.

## Supported versions

We provide security updates for the latest `1.x` release line. Please make sure
you are on a current `1.x` build before reporting an issue.

| Version | Supported          |
| ------- | ------------------ |
| `1.x`   | ✅ Yes             |
| `< 1.0` | ❌ No              |

If a fix is required, it will be released as a new `1.x` version.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**
Public issues are visible to everyone and can expose users before a fix is
available.

Instead, report it **privately** through GitHub's private vulnerability
reporting (security advisories):

1. Go to the
   [Security tab](https://github.com/ngoldbla/irb-in-chrome/security).
2. Click **Report a vulnerability** to open a private advisory.
3. Fill in the details described below.

This creates a private channel visible only to the maintainers and to you, so we
can triage and coordinate a fix and disclosure responsibly.

### What to include

A good report helps us reproduce and fix the issue quickly. Where possible,
please include:

- A clear description of the vulnerability and its potential impact.
- The affected version (e.g. `1.0.0`) and your Chrome version.
- Step-by-step instructions to reproduce, including any relevant Cayuse page
  state (sanitize or redact any real personnel data — see note below).
- Proof-of-concept code, screenshots, or logs if you have them.
- Any suggested remediation or references, if you have them.

**Privacy note:** Do not include real personnel PII (names, emails, training
records) or any institutional data in your report. Use redacted or synthetic
examples to demonstrate the issue.

### What to expect

- **Acknowledgement:** within **3 business days** of your report.
- **Initial assessment:** typically within **7 business days**, including a
  severity estimate and next steps.
- **Resolution:** we aim to ship a fix in a new `1.x` release as soon as is
  practical for the confirmed severity, and will keep you updated through the
  private advisory.
- **Credit:** with your permission, we are glad to credit you in the advisory
  and release notes once a fix is published.

We follow a coordinated disclosure approach: please give us a reasonable
opportunity to release a fix before any public disclosure.

## Security posture

IRB CITI Checker is designed to be private and low-risk by default:

- **No network requests.** The extension makes **zero** outbound network
  requests. All scanning, compliance evaluation, and notification text are
  generated locally in the browser.
- **No external services, no AI, no API keys.** There is no LLM, no third-party
  API, and no telemetry or analytics. Notifications are produced by a
  deterministic, editable local template with mail-merge fields — no model is
  involved. (Earlier pre-1.0 prototypes used an external LLM service; that has
  been removed entirely.)
- **Minimal permission set.** The extension requests only:
  - `sidePanel` — show results in Chrome's side panel (UI only).
  - `storage` — persist scan results and settings in `chrome.storage.local`.
  - `activeTab` — read the active tab's URL to confirm you are on a Cayuse page.
  - `scripting` — inject the content script into Cayuse tabs as a fallback.
  - Host permission `*://*.cayuse.com/*` — scoped to Cayuse tenants only; the
    extension cannot run on arbitrary websites.
- **Local-only data storage.** All data is stored exclusively in
  `chrome.storage.local`, sandboxed to this extension by the browser, and is
  **never transmitted** anywhere.
- **Manifest V3 with an explicit CSP.** The extension runs under Chrome
  Manifest V3 with a restrictive content security policy
  (`script-src 'self'; object-src 'self'`), blocking inline scripts and remote
  code. Scraped values are HTML-escaped before being rendered in the UI.

Because no data leaves the browser and no credentials are stored, the practical
attack surface is small. The most relevant residual risks involve local device
access to `chrome.storage.local` and handling of untrusted DOM content scraped
from a Cayuse page.

For the detailed threat model — assets, threat actors, attack surface,
permission justifications, and known residual risks — see
[`governance/04-security.md`](governance/04-security.md).

## Scope

This policy covers the IRB CITI Checker extension source in this repository.
Vulnerabilities in third-party platforms (e.g. Cayuse, the Chrome browser, or
the CITI Program) should be reported to those vendors directly. If you are
unsure whether something is in scope, report it privately and we will help
route it.
