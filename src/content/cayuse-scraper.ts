import { SELECTORS } from './selectors';
import { detectCayusePage, isCayuseUrl, isPersonnelSection } from './page-detector';
import type { ScrapedPersonnel, ScrapedTraining, ScrapedSubmissionData } from '../types/cayuse';
import type { ExtensionMessage } from '../types/messages';

// ── Constants ────────────────────────────────────────────────

/** Map assignment-type class fragments to role labels */
const ASSIGNMENT_TYPE_TO_ROLE: Record<string, string> = {
  PRINCIPAL_INVESTIGATOR: 'Principal Investigator',
  CO_PRINCIPAL_INVESTIGATOR: 'Co-Principal Investigator',
  FACULTY_ADVISOR: 'Faculty Advisor',
  PRIMARY_CONTACT: 'Primary Contact',
  OTHER: 'Other Personnel',
};

/** Max time to wait for a training modal to open/close (ms) */
const MODAL_TIMEOUT = 5000;

/** Delay between training modal open/close cycles (ms) */
const MODAL_CYCLE_DELAY = 300;

// ── DOM Helpers ──────────────────────────────────────────────

/** Get trimmed text content of an element, or empty string */
function textOf(el: Element | null | undefined): string {
  return el?.textContent?.trim() ?? '';
}

/** Wait for an element matching a selector to appear in the DOM */
function waitForElement(selector: string, timeout = MODAL_TIMEOUT): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/** Wait for an element to be removed from the DOM */
function waitForElementRemoved(selector: string, timeout = MODAL_TIMEOUT): Promise<void> {
  return new Promise((resolve) => {
    if (!document.querySelector(selector)) {
      resolve();
      return;
    }

    const observer = new MutationObserver(() => {
      if (!document.querySelector(selector)) {
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, timeout);
  });
}

/** Small delay helper */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Personnel Scraping ───────────────────────────────────────

/**
 * Extract the assignment role from a container's class list.
 * e.g. "form-object-contents clearfix assignment-type-PRINCIPAL_INVESTIGATOR"
 *       → "Principal Investigator"
 */
function extractRoleFromContainer(container: Element): string {
  const classList = Array.from(container.classList);
  for (const cls of classList) {
    if (cls.startsWith('assignment-type-')) {
      const typeKey = cls.replace('assignment-type-', '');
      return ASSIGNMENT_TYPE_TO_ROLE[typeKey] ?? typeKey;
    }
  }
  return 'Unknown';
}

/**
 * Check if a table row is a real data row (not a header, sort dropdown, or spacer).
 * Data rows contain at least one td.e3-table-row-cell.
 */
function isDataRow(row: Element): boolean {
  return row.querySelector(SELECTORS.personnel.dataCell) !== null;
}

/**
 * Scrape personnel data from all assignment-type containers on the current page.
 * Works on section 1.2 (KSU) and section 1.3 (Non-KSU) of the submission form.
 */
function scrapePersonnel(): ScrapedPersonnel[] {
  const containers = document.querySelectorAll(SELECTORS.personnel.assignmentContainer);
  const results: ScrapedPersonnel[] = [];
  const seen = new Set<string>(); // Deduplicate by name+role

  for (const container of containers) {
    const role = extractRoleFromContainer(container);

    // Skip PRIMARY_CONTACT — they're typically the same person as the PI
    if (role === 'Primary Contact') continue;

    const tables = container.querySelectorAll('table');
    for (const table of tables) {
      const rows = table.querySelectorAll('tbody tr');
      for (const row of rows) {
        if (!isDataRow(row)) continue;

        const cells = row.querySelectorAll(SELECTORS.personnel.dataCell);
        if (cells.length < 5) continue;

        // Cell order: Name, Organization, Address, Phone, Email, [Trainings], [Remove]
        const name = textOf(cells[0]);
        const institution = textOf(cells[1]);
        const email = textOf(cells[4]);

        if (!name) continue;

        const key = `${name}|${role}`;
        if (seen.has(key)) continue;
        seen.add(key);

        results.push({
          name,
          role,
          email: email || undefined,
          institution: institution || undefined,
        });
      }
    }
  }

  return results;
}

// ── Training Scraping (via modal click) ──────────────────────

/**
 * Scrape training records from the currently open training modal.
 * The modal table has columns: Course Name, Group, Stage, Status, Completion Date, Expiration Date.
 * Every other row is a spacer (empty) and should be skipped.
 */
function scrapeTrainingModal(): ScrapedTraining[] {
  const table = document.querySelector(SELECTORS.training.table);
  if (!table) return [];

  const rows = table.querySelectorAll('tbody tr');
  const trainings: ScrapedTraining[] = [];

  for (const row of rows) {
    const cells = row.querySelectorAll(SELECTORS.training.dataCell);
    // Skip spacer rows (empty rows with no data cells)
    if (cells.length < 5) continue;

    const courseName = textOf(cells[0]);
    const completionDate = textOf(cells[4]);
    const expirationDate = textOf(cells[5]);

    if (!courseName || !completionDate) continue;

    trainings.push({
      personnelName: '', // Will be filled in by the caller
      courseName,
      completionDate,
      expirationDate: expirationDate || undefined,
      registeredEmail: undefined, // Not shown in Cayuse training modal
      hasPdfAttachment: false, // Not shown in Cayuse training modal
    });
  }

  return trainings;
}

/**
 * Click "View" on a personnel row to open the training modal,
 * scrape the training records, then close the modal.
 */
async function scrapeTrainingsForRow(
  row: Element,
  personnelName: string,
): Promise<ScrapedTraining[]> {
  // Find the "View" link/button in the training cell
  const trainingCell = row.querySelector(SELECTORS.personnel.trainingCell);
  const viewButton = trainingCell?.querySelector('a, button');

  if (!viewButton) {
    // No training view button — this person has no linked trainings
    return [];
  }

  // Click the View button
  (viewButton as HTMLElement).click();

  // Wait for the training modal to appear
  const modal = await waitForElement(SELECTORS.training.dialog);
  if (!modal) {
    console.warn(`[IRB Checker] Training modal did not open for ${personnelName}`);
    return [];
  }

  // Small delay for the table to fully render
  await delay(MODAL_CYCLE_DELAY);

  // Scrape training records from the modal
  const trainings = scrapeTrainingModal();

  // Tag each record with the person's name
  for (const t of trainings) {
    t.personnelName = personnelName;
  }

  // Close the modal
  const closeBtn = document.querySelector(SELECTORS.training.closeButton);
  if (closeBtn) {
    (closeBtn as HTMLElement).click();
    await waitForElementRemoved(SELECTORS.training.modal);
    await delay(MODAL_CYCLE_DELAY);
  }

  return trainings;
}

/**
 * Iterate through all personnel rows and scrape training records for each.
 * This is sequential because each person's trainings require opening a modal.
 */
async function scrapeAllTrainings(): Promise<ScrapedTraining[]> {
  const containers = document.querySelectorAll(SELECTORS.personnel.assignmentContainer);
  const allTrainings: ScrapedTraining[] = [];
  const processedNames = new Set<string>();

  for (const container of containers) {
    const role = extractRoleFromContainer(container);
    if (role === 'Primary Contact') continue;

    const tables = container.querySelectorAll('table');
    for (const table of tables) {
      const rows = table.querySelectorAll('tbody tr');
      for (const row of rows) {
        if (!isDataRow(row)) continue;

        const cells = row.querySelectorAll(SELECTORS.personnel.dataCell);
        if (cells.length < 5) continue;

        const name = textOf(cells[0]);
        if (!name || processedNames.has(name)) continue;
        processedNames.add(name);

        const trainings = await scrapeTrainingsForRow(row, name);
        allTrainings.push(...trainings);
      }
    }
  }

  return allTrainings;
}

// ── Submission Metadata ──────────────────────────────────────

/** Extract the submission title and protocol number from the form header */
function scrapeSubmissionHeader(): { title: string; protocolNumber?: string } {
  // The header bar typically shows: "IRB NUMBER: IRB-FY25-611"
  // and the title: "Prototype Living of Tomorrow (PLOT) - Initial"

  // Try to find the IRB number from the page header
  let protocolNumber: string | undefined;
  let title = '';

  // Look for text containing "IRB-FY" pattern anywhere in the header area
  const headerEls = document.querySelectorAll(
    '.submission-header, .form-header, .content-padding, [class*="irb-number"]',
  );
  for (const el of headerEls) {
    const text = el.textContent ?? '';
    const irbMatch = text.match(/IRB-FY\d+-\d+/);
    if (irbMatch) {
      protocolNumber = irbMatch[0];
    }
  }

  // Broader fallback: search entire page for IRB number pattern
  if (!protocolNumber) {
    const bodyText = document.body.textContent ?? '';
    const match = bodyText.match(/IRB-FY\d+-\d+/);
    if (match) {
      protocolNumber = match[0];
    }
  }

  // Extract title from the page title or header
  // Page title format: "IRB - Submission - Prototype Living of Tomorrow (PLOT) - Initial"
  const pageTitle = document.title;
  const titleMatch = pageTitle.match(/Submission\s*-\s*(.+?)\s*-\s*(Initial|Renewal|Modification)/);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // Fallback: look for heading elements in the content area
  if (!title) {
    const headings = document.querySelectorAll('h1, h2, .submission-title');
    for (const h of headings) {
      const text = textOf(h);
      if (text && !text.includes('Cayuse') && !text.includes('Human Ethics') && text.length > 5) {
        title = text;
        break;
      }
    }
  }

  return { title: title || 'Unknown Submission', protocolNumber };
}

// ── Main Scrape Function ─────────────────────────────────────

async function scrapeSubmissionData(): Promise<ScrapedSubmissionData> {
  const header = scrapeSubmissionHeader();
  const personnel = scrapePersonnel();
  const trainings = await scrapeAllTrainings();

  return {
    submissionTitle: header.title,
    protocolNumber: header.protocolNumber,
    personnel,
    trainings,
    pageUrl: window.location.href,
  };
}

// ── Message Handling ─────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'REQUEST_SCRAPE') {
    scrapeSubmissionData()
      .then((data) => {
        sendResponse({ type: 'SCRAPE_RESULT', data });
      })
      .catch((err) => {
        sendResponse({
          type: 'SCRAPE_ERROR',
          error: err instanceof Error ? err.message : 'Unknown scraping error',
        });
      });
    return true; // Keep message channel open for async response
  }
});

// ── Page Detection & Auto-notify ─────────────────────────────

function notifyPageType(): void {
  const url = window.location.href;
  if (!isCayuseUrl(url)) return;

  const pageType = detectCayusePage(url);

  // Map new page types to the message interface's expected types
  let messagePageType: 'submission' | 'personnel' | 'training' | 'unknown';
  switch (pageType) {
    case 'submissionForm':
      messagePageType = isPersonnelSection(url) ? 'personnel' : 'submission';
      break;
    case 'submissionDetail':
    case 'studyDetail':
      messagePageType = 'submission';
      break;
    default:
      messagePageType = 'unknown';
  }

  try {
    chrome.runtime.sendMessage({
      type: 'PAGE_DETECTED',
      pageType: messagePageType,
      url,
    });
  } catch {
    // Service worker may not be ready yet — safe to ignore
  }
}

// Notify on initial load
notifyPageType();

// Watch for SPA navigation (Cayuse uses hash-based routing)
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    notifyPageType();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Also listen for hashchange events (more reliable for SPA navigation)
window.addEventListener('hashchange', () => {
  notifyPageType();
});
