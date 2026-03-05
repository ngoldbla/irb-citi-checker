# Runbook

**Last Reviewed:** 2026-03-04

Operational procedures for maintaining and troubleshooting the IRB CITI Compliance Checker extension.

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
   - Navigate to a Cayuse submission page
   - Click the extension icon to open the side panel
   - Click "Scan Personnel" and confirm results appear

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

---

## Procedure 3: Update DOM Selectors After Cayuse UI Change

**Trigger:** Cayuse deploys a UI update that breaks scraping (detected via Procedure 2).

### Steps

1. **Document** which selectors are broken and what the new DOM structure looks like.

2. **Update selectors** in `src/content/selectors.ts`:
   ```typescript
   // Example: Cayuse changed .e3-table-row-cell to .data-cell
   dataCell: 'td.data-cell',  // Updated YYYY-MM-DD: Cayuse renamed class
   ```

3. If the old selector might coexist during Cayuse's rollout, add it as a fallback:
   ```typescript
   dataCell: 'td.data-cell, td.e3-table-row-cell',
   ```

4. If fallback chains in `cayuse-scraper.ts` need updating (e.g., `findViewButton()`, `findTrainingTable()`), update those arrays.

5. Add a comment with the date and what changed:
   ```typescript
   /** Updated YYYY-MM-DD: Cayuse changed X from .old-class to .new-class */
   ```

6. Rebuild and test:
   ```bash
   npm run build
   ```

7. Reload the extension in Chrome and test against a live Cayuse submission.

8. Update the "Last Reviewed" date and DOM selectors table in `governance/01-architecture.md` Section 2.2.

9. Follow the change management process in `governance/07-change-management.md`.

---

## Procedure 4: Rotate or Update Portkey API Key

**Trigger:** API key compromised, expired, or needs rotation.

### Steps

1. Generate a new API key in the Portkey dashboard (or your configured LLM provider)

2. In the extension side panel, click the **gear icon** (Settings)

3. Update the **"Portkey API Key"** field with the new key

4. Click **"Save"**

5. Test by clicking "Generate Notification" on any submission with deficiencies

6. Verify the notification draft is generated successfully

7. **Revoke the old API key** in the Portkey dashboard

### If API key is suspected compromised:

1. Immediately revoke the old key in the Portkey dashboard
2. Check Portkey usage logs for unauthorized API calls
3. Generate and install a new key (steps 1-6 above)
4. Document the incident

---

## Procedure 5: Clear Extension Data

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
   - `settings` - clears API key and configuration

### Option C: Full Reset

1. Open `chrome://extensions`
2. Click **"Remove"** on the extension
3. Reinstall from `dist/` directory

**Note:** All options clear the Portkey API key. The user will need to reconfigure settings afterward.

---

## Procedure 6: Investigate LLM Notification Failure

**Trigger:** "Generate Notification" button fails with an error message.

### Steps

1. Open DevTools on the extension's **service worker**:
   - Go to `chrome://extensions`
   - Find "IRB CITI Compliance Checker"
   - Click **"Inspect views: service worker"**

2. Check the console for error messages from `chatCompletion()`

3. Diagnose by error message:

   | Error | Cause | Fix |
   |---|---|---|
   | `Portkey API key and base URL must be configured` | Settings not saved | Open Settings, enter API key and base URL, save |
   | `LLM API error (401)` | Invalid or expired API key | Rotate API key (Procedure 4) |
   | `LLM API error (403)` | Forbidden - key lacks permissions | Check Portkey API key permissions |
   | `LLM API error (429)` | Rate limited by Portkey/OpenAI | Wait and retry; consider increasing quota |
   | `LLM API error (500/502/503)` | Portkey/OpenAI service outage | Check Portkey status page; retry later |
   | `LLM returned empty response` | Model returned no content | Unusual; try again or check model availability |
   | `Failed to fetch` | Network error | Check URL in settings; check firewall/VPN; verify HTTPS |

4. If the error is a network issue:
   - Verify the Portkey base URL is correct (e.g., `https://api.portkey.ai/v1`)
   - Check if VPN or firewall is blocking the request
   - Try the URL directly with `curl` to isolate browser vs. network issues

---

## Procedure 7: Handle New Compliance Rule Request

**Trigger:** IRB Office requests a new compliance rule or modification to existing rules.

### Steps

1. **Document the rule** with the IRB Office:
   - Rule description in plain language
   - When it applies (KSU only? External only? All personnel?)
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
   | `src/lib/notification-templates.ts` | Update if new rule needs special LLM prompt handling |

4. **Update governance docs:**
   - Update `governance/01-architecture.md` Section 5 (compliance rules table)
   - Update risk register if the rule introduces new risks

5. **Follow change management** process in `governance/07-change-management.md` Section 2.2.

---

## Procedure 8: Verify Extension Health After Chrome Update

**Trigger:** Chrome browser auto-updates to a new major version.

### Steps

1. Check `chrome://extensions` for any error badges (red warning icons) on the extension

2. If errors appear:
   - Click "Details" to see the error message
   - Click "Errors" to see detailed error logs
   - Common issues: service worker registration failures, CSP violations

3. If no errors, perform a smoke test:
   - Navigate to a Cayuse submission page
   - Click the extension icon - side panel should open
   - Click "Scan Personnel" - results should appear
   - Open DevTools console, filter by `[IRB Checker]` - no unexpected errors

4. If issues are found, check Chrome release notes for Manifest v3 changes that may affect:
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
