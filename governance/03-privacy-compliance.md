# Privacy & Compliance

**Last Reviewed:** 2026-03-04

## 1. Regulatory Framework

### 1.1 FERPA Applicability Assessment

FERPA (Family Educational Rights and Privacy Act) protects "education records" of students who are or have been in attendance at an educational institution.

**Assessment:**
- This extension processes **researcher/personnel data** from IRB submissions, NOT student academic records.
- However, personnel listed on IRB submissions may include **graduate students** serving as Co-PIs or Other Personnel. Their names, email addresses, and training records could potentially be considered education records under a broad interpretation if they are "directly related to a student" and "maintained by an educational institution."
- The extension does not create a new system of record - it reads data the IRB reviewer already has authorized access to in Cayuse.

**Conclusion:** Likely not directly subject to FERPA for most use cases. However, a conservative interpretation should treat graduate student researcher data as FERPA-adjacent, especially when transmitted to third-party LLM services.

**Required action:** Consult KSU's FERPA officer for a formal determination specific to this extension's data handling.

### 1.2 Georgia Open Records Act

- Data stored locally in the browser (`chrome.storage.local`) is not centrally maintained by the university.
- If the extension is deployed on university-managed devices, stored data could potentially be subject to open records requests.
- **Recommendation:** Document that this tool is an operational aid and not a system of record. Scan results should not be treated as official compliance determinations.

### 1.3 CITI Program Terms of Service

- The extension reads training data that Cayuse displays via the CITI-Cayuse integration. It does NOT directly access CITI's API or website.
- **Required action:** Verify that scraping Cayuse-displayed training data does not violate Cayuse's or CITI's terms of service. Review the institutional agreement with both vendors.

### 1.4 Cayuse Terms of Service

- The extension interacts with the Cayuse web interface programmatically (DOM scraping, automated modal opens/closes).
- This may be considered "automated access" under Cayuse's terms.
- **Required action:** Review KSU's Cayuse license agreement for restrictions on automated or programmatic access to the web interface.

## 2. Consent and Transparency

### 2.1 Extension Operator Consent

**Current state:** No consent dialog, terms of use, or privacy notice is presented on install or first use.

The extension operates on data the IRB reviewer already has authorized access to in Cayuse. The scraping and local evaluation do not involve new data access beyond what the user would see manually.

**Gap:** No explicit consent is obtained before sending PII to the external Portkey/OpenAI API when generating notification emails. The user may not understand that clicking "Generate Notification" transmits personnel data to a third-party service.

### 2.2 Data Subject Consent

Personnel listed on IRB submissions have not consented to:
- Their data being scraped by a browser extension
- Their PII being evaluated by an automated compliance engine
- Their PII being sent to a third-party LLM API (Portkey/OpenAI)

**Mitigation context:** The IRB reviewer is an authorized user of Cayuse viewing data they already have access to. The extension automates a manual compliance check. The novel risk is the LLM transmission, which is an entirely new data use that requires justification.

### 2.3 Recommended Consent Measures

1. **First-run consent dialog:** On first use, display a notice explaining:
   - What data the extension collects (personnel names, emails, training records)
   - That data is stored locally in the browser
   - That notification generation sends data to an external AI service
2. **Pre-LLM confirmation:** Before each notification generation, show a dialog disclosing:
   - Which personnel data will be sent
   - The destination service (Portkey/OpenAI)
   - A reminder that this data may be retained by the LLM provider per their policies
3. **Privacy notice:** Add an accessible privacy notice in the extension settings or side panel header

## 3. Third-Party Data Sharing

### 3.1 Portkey / OpenAI

| Aspect | Detail |
|---|---|
| **What is shared** | Personnel names, roles, emails, institution, KSU/external status, training records (course names, dates, registered emails), deficiency descriptions and recommendations, protocol number, submission title |
| **When** | Only when user clicks "Generate Notification" button |
| **API endpoint** | User-configured (`portkeyBaseUrl` + `/chat/completions`) |
| **Authentication** | Bearer token (`portkeyApiKey`) sent in Authorization header over HTTPS |
| **Data path** | Extension -> Portkey API Gateway -> OpenAI (or configured LLM provider) |
| **Data retention by third party** | Depends on Portkey and OpenAI data retention policies. Enterprise agreements may differ from consumer terms. |
| **Model used** | Configurable; defaults to `gpt-5.2` |

### 3.2 Required Actions

- [ ] Verify KSU has a Data Processing Agreement (DPA) with Portkey and/or OpenAI that covers PII handling
- [ ] Determine whether the Portkey configuration routes through KSU's institutional AI agreement or a personal API key
- [ ] If personal API keys are used, confirm whether OpenAI's default data retention and model training policies apply (consumer terms may allow OpenAI to train on submitted data)
- [ ] Consider establishing an institutional Portkey/OpenAI endpoint with appropriate DPA and data handling guarantees
- [ ] Evaluate whether a self-hosted LLM (e.g., on-premises or KSU cloud) could eliminate third-party data sharing entirely

### 3.3 No Other Third-Party Sharing

The extension does NOT share data with:
- Analytics services (Google Analytics, Mixpanel, etc.)
- Error reporting services (Sentry, Bugsnag, etc.)
- Any other external API or service
- Chrome Web Store (extension is side-loaded, not published)
- Other browser extensions (Chrome's sandbox prevents cross-extension storage access)

## 4. Institutional Policy Alignment

### 4.1 KSU Acceptable Use Policy

- The extension should be evaluated against KSU's IT Acceptable Use Policy for browser extensions on university systems.
- If deployed on university-managed devices, IT may need to approve the extension for installation.
- **Required action:** Submit extension for IT review if deploying on managed devices.

### 4.2 IRB Office Data Handling Procedures

- Document how this tool fits within the IRB office's existing data handling procedures.
- Clarify that the extension is a compliance-checking aid, not a system of record.
- Scan results should not be treated as official compliance determinations without human review.
- The IRB reviewer remains responsible for verifying compliance through official Cayuse records.

### 4.3 Chrome Extension Distribution Policy

- **Current state:** Extension is side-loaded (manually installed from local `dist/` directory). Not published to Chrome Web Store.
- If published to Chrome Web Store in the future, Chrome's developer policies require:
  - A privacy policy disclosing data collection, use, and sharing
  - Compliance with the Single Purpose policy
  - Data handling disclosures in the Chrome Web Store listing
- **Required action:** If distributing beyond the current team, determine the distribution method and comply with applicable policies.

## 5. Data Minimization Assessment

The following data is sent to the LLM API in notification prompts. This table assesses whether each element is necessary:

| Data Sent | Necessity | Minimization Opportunity |
|---|---|---|
| Personnel names | **Required** - needed for email addressing | None |
| Personnel roles | **Required** - context for PI notification | None |
| KSU/External status | **Required** - determines applicable recommendations | None |
| Personnel emails | **Partially needed** - only relevant for `email_mismatch` deficiencies | Send only for `email_mismatch` cases; omit for other deficiency types |
| Training course names | **Marginal** - adds context but not essential | Could omit to reduce PII surface |
| Training completion dates | **Required** - establishes training timeline | None |
| Training expiration dates | **Required** - documents when training expired | None |
| Training registered email | **Partially needed** - only relevant for `email_mismatch` | Send only for `email_mismatch` cases |
| Protocol number | **Required** - email reference identifier | None |
| Submission title | **Required** - email reference context | None |
| Deficiency descriptions | **Required** - core email content | Already contains PII (person names); cannot be further minimized without losing utility |
| Deficiency recommendations | **Required** - actionable guidance | Contains PII (person names) |

**Recommended minimization actions:**
1. Exclude `registeredEmail` from the prompt except for `email_mismatch` deficiencies
2. Exclude training course names (marginal value, adds data surface)
3. Consider using placeholder names in prompts and substituting real names post-generation (reduces PII exposure to LLM)
