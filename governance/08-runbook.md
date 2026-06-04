# Runbook

**Last Reviewed:** 2026-06-04

Operational procedures for maintaining and troubleshooting the IRB CITI Compliance
Checker extension.

This extension runs **fully offline**: it makes no network requests, uses no AI/LLM
or external services, and stores all data only in `chrome.storage.local`. PI
notifications are produced by a **deterministic, editable local template** with
mail-merge fields. Procedures below reflect that architecture.

For a concrete, worked adoption walkthrough (install, optional Settings override,
template customization), see [`docs/DEPLOYMENT_EXAMPLE.md`](../docs/DEPLOYMENT_EXAMPLE.md).

---

## Procedure 1: Build and Deploy the Extension

**Trigger:** New version needs to be deployed to user machines.

### Steps

1. Ensure you are on the correct branch with latest changes:
   ```bash
   git checkout main && git pull
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Verify `dist/` contains all expected files:
   ```
   dist/
     manifest.json
     service-worker.js
     content-script.js
     sidepanel/index.html
     assets/icon-16.png
     assets/icon-48.png
     assets/icon-128.png
   ```

5. On the target machine:
   - Open `chrome://extensions`
   - Enable **Developer Mode** (toggle in top-right corner)
   - Click **"Load unpacked"** (first install) or click the **refresh icon** (update)
   - Select the `dist/` directory

6. Verify:
   - Extension icon appears in the Chrome toolbar
   - Navigate to a Cayuse submission page (any `*.cayuse.com` tenant)
   - Click the extension icon to open the side panel
   - Click "Scan Personnel" and confirm results appear

> For distribution options (release zip vs. Chrome Web Store) and the fact that the
> same base build works at any institution, see `docs/DEPLOYMENT_EXAMPLE.md` § 1.

---

## Procedure 2: Diagnose Scraping Failure

**Trigger:** User reports "Scan" returns 0 personnel or missing training data.

### Steps

1. Open Chrome DevTools on the Cayuse tab (`F12` or `Cmd+Option+I`)

2. Go to the **Console** tab and filter by `[IRB Checker]`

3. Click "Scan Personnel" in the extension side panel

4. Check console output for diagnostic messages:

   | Console Message | Meaning | Action |
   |---|---|---|
   | `scrapePersonnel: found 0 assignment containers` | Personnel container selector broken | Inspect DOM for new container pattern |
   | `scrapePersonnel: data row has only N cells (need 5+)` | Table cell structure changed | Inspect DOM for new cell layout |
   | `No View button found for [name]` | Training button selector broken | Inspect DOM for new "View" button pattern |
   | `Training modal did not open for [name]` | Modal selector broken | Manually click "View" and inspect modal DOM |
   | `No training table found in modal` | Training table selector broken | Open modal manually and inspect table DOM |
   | `Timed out waiting for training data to load` | Cayuse slow or training data format changed | Check network tab for AJAX calls; increase timeout if needed |

5. If the issue is a selector change, proceed to **Procedure 3**.

6. If the issue is timing-related (timeouts), check:
   - Network tab for slow AJAX responses from Cayuse
   - Whether the issue is reproducible or intermittent
   - Consider increasing `MODAL_TIMEOUT` in the source code

> **Note:** These diagnostics are vendor-generic. Cayuse renders the same form
> structure across tenants, so a selector break typically affects every institution
> at once — reproduce on any `*.cayuse.com` submission, not a specific subdomain.

---

## Procedure 3: Update DOM Selectors After Cayuse UI Change

**Trigger:** Cayuse deploys a UI update that breaks scraping (detected via Procedure 2).

### Steps

1. **Document** which selectors are broken and what the new DOM structure looks like.
   Capture the DOM from a real Cayuse submission on any tenant.

2. **Update selectors** in `src/content/selectors.ts`:
   ```typescript
   // Example: Cayuse changed .e3-table-row-cell to .data-cell
   dataCell: 'td.data-cell',  // Updated YYYY-MM-DD: Cayuse renamed class
   ```

3. If the old selector might coexist during Cayuse's rollout, add it as a fallback:
   ```typescript
   dataCell: 'td.data-cell, td.e3-table-row-cell',
   ```

4. If fallback chains in `cayuse-scraper.ts` need updating (e.g., `findViewButton()`,
   `findTrainingTable()`), update those arrays.

5. Add a comment with the date and what changed:
   ```typescript
   /** Updated YYYY-MM-DD: Cayuse changed X from .old-class to .new-class */
   ```

6. Rebuild and test:
   ```bash
   npm run build
   ```

7. Reload the extension in Chrome and test against a live Cayuse submission.

8. Update the "Last Reviewed" date and DOM selectors table in
   `governance/01-architecture.md` Section 2.2.

9. Follow the change management process in `governance/07-change-management.md`.

---

## Procedure 4: Customize or Reset the PI Notification Template

**Trigger:** Staff want to change the wording, structure, or sign-off of the
auto-generated PI notification, or restore the built-in default.

Notifications are rendered locally by `src/lib/notification-renderer.ts` from a
plain-text template. No model is involved. The template supports the following
mail-merge fields, each written as `{{field}}`:

`{{piName}}` · `{{protocolNumber}}` · `{{submissionTitle}}` · `{{institutionName}}` ·
`{{date}}` · `{{deficiencies}}`

The `{{deficiencies}}` field expands to one block per flagged person, assembled from
the evaluator's structured `description` and `recommendation` output. Unknown
placeholders are left intact rather than blanked, so a typo is visible in the output.

### Customize the template (per-machine, via Settings)

1. Open the extension side panel and click the **gear icon** (Settings).

2. Edit the **"Notification template"** text area. Use any of the merge fields above.

3. Click **"Save"**. The template is stored in `chrome.storage.local` under the
   `settings.notificationTemplate` key and applies to all future notifications on
   that machine.

4. Test by opening a submission with deficiencies and confirming the rendered draft
   reflects your wording with the merge fields populated correctly.

> A blank template field means "use the built-in default" — saving an empty value
> resets behavior to the default without needing the reset button.

### Reset the template to the built-in default

1. Open Settings (gear icon).

2. Click **"Reset to default"** under the template field. This repopulates the field
   with `DEFAULT_NOTIFICATION_TEMPLATE` from `src/lib/notification-renderer.ts`.

3. Click **"Save"**.

### Change the built-in default for all users (code change)

1. Edit `DEFAULT_NOTIFICATION_TEMPLATE` in `src/lib/notification-renderer.ts`.

2. If you add or remove merge fields, also update the `TEMPLATE_FIELDS` array in the
   same file and the field documentation in `docs/DEPLOYMENT_EXAMPLE.md` § 2.

3. Rebuild (`npm run build`), reload the extension, and verify the rendered draft.

4. Follow the change management process in `governance/07-change-management.md`.

> Staff copy the rendered text and paste it into Cayuse's "Missing information or
> materials" field (or any correspondence) themselves. The extension does not click
> through Cayuse's UI — see the documented stub in `src/content/cayuse-navigator.ts`.

---

## Procedure 5: Configure the Institution Override

**Trigger:** Auto-detection of the home institution is wrong or imprecise — e.g.
personnel are mis-classified as internal/external, or the `{{institutionName}}` field
in notifications reads as a bare subdomain token instead of the proper name.

By default the extension **auto-detects** the home institution from the Cayuse
subdomain (logic in `src/lib/institution.ts`). An optional manual override in
Settings makes classification exact and the display name correct.

### Steps

1. Open the extension side panel and click the **gear icon** (Settings).

2. Set **"Institution name"** to the display name you want in notifications
   (e.g. `Example University`). Leaving it blank keeps auto-detection.

3. Set **"Home email domains"** to a comma-separated list of the domains that
   identify internal personnel (e.g. `example.edu, students.example.edu`). Leaving it
   blank keeps subdomain-token matching.

4. Click **"Save"**. Values persist in `chrome.storage.local` under
   `settings.institutionName` and `settings.institutionEmailDomains`.

5. Re-run "Scan Personnel" on a known submission and confirm:
   - Internal vs. external classification is now correct.
   - The `{{institutionName}}` field renders the configured name.

### When the override is needed

- The Cayuse subdomain does not clearly contain your institution's short name.
- Personnel use multiple email domains, or a domain that does not contain the
  subdomain token.
- You want notifications to spell out the full institution name.

When home email domains are configured, exact domain matching takes precedence over
the looser subdomain-token substring match. For a worked example of both
auto-detection and override, see `docs/DEPLOYMENT_EXAMPLE.md` § 2.

---

## Procedure 6: Clear Extension Data

**Trigger:** Need to clear stored PII, reset extension state, or free storage space.

### Option A: Clear via Chrome Settings

1. Open `chrome://extensions`
2. Find "IRB CITI Compliance Checker"
3. Click **"Details"**
4. Click **"Clear storage"** (under "Storage used")
5. Verify by opening the extension - should show empty state

### Option B: Clear via DevTools

1. Open the extension side panel
2. Open DevTools on the side panel (`right-click > Inspect`)
3. Go to **Application** tab > **Storage** > **Local Storage** (extension context)
4. Delete specific keys:
   - `currentSubmission` - clears current scan results
   - `submissionHistory` - clears all historical scans
   - `settings` - clears the institution override and notification template

### Option C: Full Reset

1. Open `chrome://extensions`
2. Click **"Remove"** on the extension
3. Reinstall from `dist/` directory

**Note:** Options A and C clear the saved `settings` (institution override and custom
notification template). After a full reset, staff will need to re-enter any override
or custom template; otherwise the extension falls back to auto-detection and the
built-in default template.

---

## Procedure 7: Diagnose a Notification Rendering Issue

**Trigger:** A generated PI notification is empty, missing a person, or shows raw
`{{placeholder}}` text instead of merged values.

Notification rendering is deterministic and local — there is no service to call and
no error to retry. A wrong output is a data or template issue, not an outage.

### Steps

1. Open DevTools on the extension's **service worker**:
   - Go to `chrome://extensions`
   - Find "IRB CITI Compliance Checker"
   - Click **"Inspect views: service worker"**

2. Diagnose by symptom:

   | Symptom | Likely Cause | Fix |
   |---|---|---|
   | A `{{placeholder}}` appears literally in the output | Typo or unsupported field name in the saved template | Edit the template to use a supported field; valid fields are listed in Procedure 4 |
   | "No outstanding CITI compliance items." appears | No flagged personnel matched the render target | Confirm the scan actually found deficiencies (Procedure 2); re-scan |
   | A flagged person is missing from the draft | Person was not classified as deficient, or a target-personnel filter excluded them | Re-check classification and the institution override (Procedure 5) |
   | `{{institutionName}}` shows a bare token (e.g. "example") | Auto-detected name, no override set | Set the institution override (Procedure 5) |
   | Draft uses old wording after editing the template | Settings not saved, or wrong machine | Re-open Settings, confirm the template text, click Save |

3. If the output is structurally correct but the wording needs to change, use
   **Procedure 4** to customize or reset the template.

4. If the rendered date is wrong, note that `{{date}}` reflects the scan timestamp
   (`scannedAt`) when present, otherwise today's date — re-scan to refresh it.

---

## Procedure 8: Handle New Compliance Rule Request

**Trigger:** The IRB Office requests a new compliance rule or modification to existing
rules.

### Steps

1. **Document the rule** with the IRB Office:
   - Rule description in plain language
   - When it applies (home institution only? external only? all personnel?)
   - What compliance status it produces
   - What the deficiency message and recommendation should say
   - Priority relative to existing rules

2. **Review governance impact:**
   - Check `governance/06-risk-register.md` for implications
   - Check `governance/03-privacy-compliance.md` if the rule changes data handling
   - Get governance sign-off if required

3. **Implement the rule** (files to modify):

   | File | Change |
   |------|--------|
   | `src/types/models.ts` | Add new `DeficiencyType` variant (if new deficiency type) |
   | `src/types/models.ts` | Update `CitiStatus.overallStatus` union (if new status) |
   | `src/types/models.ts` | Add entry to `STATUS_COLORS` (if new status) |
   | `src/lib/citi-evaluator.ts` | Add rule logic in `evaluatePerson()` |
   | `src/sidepanel/components/status-badge.ts` | Add label in `STATUS_LABELS` (if new status) |
   | `src/sidepanel/components/deficiency-report.ts` | Add entry in `TYPE_LABELS` and `TYPE_COLORS` (if new deficiency type) |
   | `src/lib/notification-renderer.ts` | Update only if the new rule needs a new merge field or default-template wording |

4. **Update governance docs:**
   - Update `governance/01-architecture.md` Section 5 (compliance rules table)
   - Update risk register if the rule introduces new risks

5. **Follow change management** process in `governance/07-change-management.md`
   Section 2.2.

> **Dormant rules:** `external_institution_no_pdf` and `email_mismatch` in
> `citi-evaluator.ts` are intentionally retained for future data sources (external
> PDF attachment detection and registered-email comparison). Do not remove them when
> adding new rules.

---

## Procedure 9: Verify Extension Health After Chrome Update

**Trigger:** Chrome browser auto-updates to a new major version.

### Steps

1. Check `chrome://extensions` for any error badges (red warning icons) on the
   extension

2. If errors appear:
   - Click "Details" to see the error message
   - Click "Errors" to see detailed error logs
   - Common issues: service worker registration failures, CSP violations

3. If no errors, perform a smoke test:
   - Navigate to a Cayuse submission page
   - Click the extension icon - side panel should open
   - Click "Scan Personnel" - results should appear
   - Open a submission with deficiencies and confirm the notification draft renders
   - Open DevTools console, filter by `[IRB Checker]` - no unexpected errors

4. If issues are found, check Chrome release notes for Manifest v3 changes that may
   affect:
   - Service worker lifecycle (termination behavior, startup timing)
   - `chrome.storage` API (quota changes, behavior changes)
   - `chrome.sidePanel` API (behavior changes, deprecations)
   - Content script injection (timing changes, security policy changes)
   - Message passing (`chrome.runtime.sendMessage` behavior)

5. If a Chrome update breaks the extension:
   - Document the specific breakage
   - Check the Chrome Extensions developer documentation for migration guidance
   - Fix and deploy following the standard change management process
   - Consider pinning Chrome version on managed devices until a fix is available
