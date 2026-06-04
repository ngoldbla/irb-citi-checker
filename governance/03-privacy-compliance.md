# Privacy & Compliance

**Last Reviewed:** 2026-06-04

> **Privacy posture in one line:** The extension runs **fully offline**. It makes
> **zero network requests**, contains **no AI/LLM and no external services**, and
> stores everything **locally in `chrome.storage.local`**. No personnel data ever
> leaves the reviewer's browser. This local-only design materially strengthens the
> privacy posture and removes an entire class of third-party data-sharing concerns
> that earlier, network-dependent versions had to manage.

This document is written to be **institution-neutral**. Where a determination
depends on local policy or law, it points you to your institution's privacy
office, IRB office, and legal/records counsel rather than naming a specific
statute or office. For a concrete, worked example of adopting the extension at a
single institution, see [`docs/DEPLOYMENT_EXAMPLE.md`](../docs/DEPLOYMENT_EXAMPLE.md).

## 1. Regulatory Framework

> The analysis below is generic guidance, not legal advice. Privacy law varies by
> jurisdiction and institution type. Confirm each item with your institution's
> privacy office and legal counsel before relying on it.

### 1.1 Student-Records Privacy (e.g., FERPA-style protections)

Many institutions are subject to laws protecting student "education records"
(in the United States, FERPA — the Family Educational Rights and Privacy Act; other
jurisdictions have analogues). The relevant question is whether the data this
extension touches falls within that protected category.

**Assessment:**
- The extension processes **researcher/personnel data** from IRB submissions, not
  student academic records.
- However, personnel listed on an IRB submission may include **graduate students**
  serving as Co-PIs or Other Personnel. Their names, email addresses, and training
  records could, under a broad interpretation, be considered education records if
  they are "directly related to a student" and "maintained by an educational
  institution."
- The extension does **not** create a new system of record. It reads data the IRB
  reviewer is already authorized to see in Cayuse, evaluates it locally, and stores
  the result only in the reviewer's own browser.

**Conclusion:** For most use cases this is likely not a student-records matter.
A conservative posture treats graduate-student researcher data as
records-privacy-adjacent. Because the extension performs **no external
transmission**, the most sensitive historical concern (sending student-adjacent
PII to a third party) does not apply.

**Recommended action:** Ask your institution's privacy/records office for a formal
determination specific to this extension's local-only data handling.

### 1.2 Public-Records and Records-Retention Laws

- Data stored locally in the browser (`chrome.storage.local`) is not centrally
  maintained by the institution and is not transmitted anywhere.
- If the extension is deployed on institution-managed devices, locally stored
  scan results could, depending on jurisdiction, fall within the scope of
  applicable **public-records and records-retention laws**.
- **Recommendation:** Document that this tool is an **operational aid**, not a
  **system of record**. Scan results are not official compliance determinations and
  should not be retained as if they were. Confirm any retention obligations with the
  office responsible for records management at your institution.

### 1.3 CITI Program Terms of Service

- The extension reads training data that Cayuse displays via the CITI–Cayuse
  integration. It does **not** directly access CITI's API or website.
- **Recommended action:** Verify that reading Cayuse-displayed training data is
  consistent with your institution's agreements with both vendors.

### 1.4 Cayuse Terms of Service

- The extension interacts with the Cayuse web interface programmatically (DOM
  reading and automated modal opens/closes to surface training records).
- This may be considered "automated access" under Cayuse's terms.
- **Recommended action:** Review your institution's Cayuse license agreement for
  restrictions on automated or programmatic access to the web interface.

## 2. Consent and Transparency

### 2.1 Extension Operator Consent

**Current state:** No consent dialog, terms of use, or privacy notice is presented
on install or first use.

The extension operates only on data the IRB reviewer is already authorized to see
in Cayuse. Reading and local evaluation do not involve any new data access beyond
what the user would see manually, and **no data is transmitted off-device**.

Because there is no external transmission and no third-party processing, the consent
surface is limited to the local reading and evaluation the reviewer performs
deliberately by clicking **Scan**.

### 2.2 Data Subject Consent

Personnel listed on IRB submissions have not separately consented to:
- Their data being read by a browser extension
- Their data being evaluated by an automated compliance engine

**Mitigation context:** The IRB reviewer is an authorized user of Cayuse viewing
data they already have access to. The extension automates a manual compliance check
that the reviewer could perform by hand. Critically, there is **no new external data
use**: nothing is sent to any outside service, so there is no third-party retention,
profiling, or model-training risk to disclose or justify.

### 2.3 Recommended Transparency Measures

Even though the extension is local-only, basic transparency remains good practice:

1. **First-run notice (optional):** On first use, display a short notice explaining:
   - What data the extension reads (personnel names, emails, training records)
   - That data is stored **locally** in the browser and **never transmitted**
   - That notifications are produced by a local, editable template — no AI and no
     external service is involved
2. **Privacy notice:** Add an accessible privacy statement in the extension settings
   or side-panel header that states the zero-network, local-only posture plainly.

## 3. Data Sharing

### 3.1 No External Data Sharing

The extension does **not** transmit data anywhere. There is no API call, no AI/LLM,
no telemetry, and no external dependency at runtime. Specifically, it does **not**
share data with:

- Any AI/LLM or model provider (none is used; notifications are produced by a local
  template)
- Analytics services (Google Analytics, Mixpanel, etc.)
- Error-reporting services (Sentry, Bugsnag, etc.)
- Any other external API or service
- The Chrome Web Store at runtime (the extension does not phone home)
- Other browser extensions (Chrome's sandbox prevents cross-extension storage access)

> **History note:** Earlier, pre-conversion versions generated notification text by
> sending personnel data to an external AI gateway. That capability — and the
> associated keys, endpoints, and data-processing-agreement requirements — has been
> **removed**. The current build performs notification generation entirely on-device
> with a deterministic template, so the third-party data-sharing concern no longer
> applies.

### 3.2 How Notifications Are Generated (Local Template)

Notification drafts are produced by a **deterministic, editable local template**
([`src/lib/notification-renderer.ts`](../src/lib/notification-renderer.ts)) using
mail-merge fields populated from the current scan:

`{{piName}}` · `{{protocolNumber}}` · `{{submissionTitle}}` · `{{institutionName}}` · `{{date}}` · `{{deficiencies}}`

The template is rendered in the side panel. Staff **copy the text and paste it into
Cayuse themselves** — the extension does not click through Cayuse's UI. (The
"Return to PI" browser automation in
[`src/content/cayuse-navigator.ts`](../src/content/cayuse-navigator.ts) is an
intentional, documented stub.) No model is involved at any step, so the output is
reproducible and reviewable.

## 4. Institutional Policy Alignment

> Map these items onto your own institution's policies and offices. See
> [`docs/DEPLOYMENT_EXAMPLE.md`](../docs/DEPLOYMENT_EXAMPLE.md) for a worked example
> of doing this at one institution.

### 4.1 Acceptable-Use / Endpoint Policy

- Evaluate the extension against your institution's IT acceptable-use policy for
  browser extensions on institution systems.
- If deployed on institution-managed devices, IT may need to approve the extension
  for installation.
- **Recommended action:** Submit the extension for IT review if deploying on
  managed devices. The zero-network design (single host permission
  `*://*.cayuse.com/*`, no outbound traffic) typically simplifies that review.

### 4.2 IRB Office Data-Handling Procedures

- Document how this tool fits within the IRB office's existing data-handling
  procedures.
- Clarify that the extension is a compliance-checking **aid**, not a **system of
  record**.
- Scan results are not official compliance determinations and require human review.
- The IRB reviewer remains responsible for verifying compliance through official
  Cayuse records.

### 4.3 Chrome Extension Distribution Policy

- **Current state:** The extension is distributed as an unpacked/side-loaded build
  (installed from a release zip or a local `dist/` directory).
- If published to the Chrome Web Store, Chrome's developer policies require:
  - A privacy policy disclosing data collection, use, and sharing (here: data is
    read locally and never shared — see [`docs/STORE_LISTING.md`](../docs/STORE_LISTING.md))
  - Compliance with the Single Purpose policy
  - Data-handling disclosures in the Chrome Web Store listing
- **Recommended action:** When distributing beyond your immediate team, choose a
  distribution method and comply with the applicable policies. The local-only,
  zero-network posture makes the required disclosures short and favorable.

## 5. Data Minimization Assessment

Because the extension performs **no external transmission**, the classic
data-minimization question — "what PII are we sending to a third party?" — does not
arise. The relevant minimization concern is instead **what is persisted locally**.

| Data Element | Necessity | Local Minimization Opportunity |
|---|---|---|
| Personnel names | **Required** — addressing the PI notification | Retained only in the current/most-recent scan; clearable |
| Personnel roles | **Required** — context for the notification | None |
| Home/external status | **Required** — determines applicable recommendations | Derived locally; not separately stored as PII |
| Personnel emails | **Required** — home-vs-external classification and email-mismatch checks | Clear stored scans when no longer needed |
| Training course names | **Marginal** — context only | Could be omitted from persisted history |
| Training completion dates | **Required** — establishes training timeline | None |
| Training expiration dates | **Required** — documents when training expired | None |
| Training registered email | **Conditional** — only relevant to the (dormant) email-mismatch rule | Not currently populated from Cayuse; retained for future data sources |
| Protocol number | **Required** — notification reference identifier | None |
| Submission title | **Required** — notification reference context | None |
| Deficiency descriptions | **Required** — core notification content | Contains person names; cannot be minimized without losing utility |
| Deficiency recommendations | **Required** — actionable guidance | Contains person names |

**Recommended minimization actions:**
1. Provide and document a **Clear stored data** action so reviewers can purge scan
   results and history when no longer needed.
2. Cap or age-out locally stored submission history so PII does not accumulate
   indefinitely (see [Data Governance](02-data-governance.md) for storage details).
3. Keep the dormant **email-mismatch** and **external-PDF** rules in place — they are
   intentionally retained for future data sources and currently store no extra PII,
   since their fields (`registeredEmail`, `hasPdfAttachment`) are not yet populated
   from Cayuse.
