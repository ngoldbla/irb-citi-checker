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
  console.log(`[IRB Checker] scrapePersonnel: found ${containers.length} assignment containers`);
  const results: ScrapedPersonnel[] = [];
  const seen = new Set<string>(); // Deduplicate by name+role

  for (const container of containers) {
    const role = extractRoleFromContainer(container);
    console.log(`[IRB Checker] scrapePersonnel: container role="${role}" classes="${container.className}"`);

    // Skip PRIMARY_CONTACT — they're typically the same person as the PI
    if (role === 'Primary Contact') continue;

    const tables = container.querySelectorAll('table');
    console.log(`[IRB Checker] scrapePersonnel: ${tables.length} table(s) in ${role} container`);
    for (const table of tables) {
      const rows = table.querySelectorAll('tbody tr');
      console.log(`[IRB Checker] scrapePersonnel: ${rows.length} row(s) in table`);
      for (const row of rows) {
        if (!isDataRow(row)) {
          // Try fallback: check for plain td cells
          const plainCells = row.querySelectorAll('td');
          if (plainCells.length >= 5 && textOf(plainCells[0])) {
            console.log(`[IRB Checker] scrapePersonnel: row has ${plainCells.length} plain td cells (no e3-table-row-cell class) — using fallback`);
            const name = textOf(plainCells[0]);
            const institution = textOf(plainCells[1]);
            const email = textOf(plainCells[4]);

            if (name) {
              const key = `${name}|${role}`;
              if (!seen.has(key)) {
                seen.add(key);
                results.push({ name, role, email: email || undefined, institution: institution || undefined });
              }
            }
          }
          continue;
        }

        const cells = row.querySelectorAll(SELECTORS.personnel.dataCell);
        if (cells.length < 5) {
          console.log(`[IRB Checker] scrapePersonnel: data row has only ${cells.length} cells (need 5+) — skipping`);
          continue;
        }

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
 * Find the training table inside the modal using progressively broader selectors.
 * Returns the first matching table element, or null.
 */
function findTrainingTable(): HTMLTableElement | null {
  const selectors = [
    SELECTORS.training.table,             // .training-finder table.e3-table
    '.training-finder table',             // any table inside training-finder
    '.modal-dialog table.e3-table',       // e3-table inside any modal dialog
    '.modal.fade.in table.e3-table',      // e3-table inside Bootstrap modal
    '.modal.show table.e3-table',         // e3-table inside Bootstrap 5 modal
    '.modal-dialog table',                // any table inside any modal dialog
    '.modal.fade.in table',              // any table inside Bootstrap modal
    '.modal.show table',                 // any table inside Bootstrap 5 modal
  ];
  for (const sel of selectors) {
    const table = document.querySelector(sel) as HTMLTableElement | null;
    if (table) {
      console.log(`[IRB Checker] Training table found with selector: ${sel}`);
      return table;
    }
  }
  return null;
}

/**
 * Wait for training data to load inside the modal.
 * Polls until: (a) a table with data rows appears, (b) a "no records" message is found, or (c) timeout.
 * Returns 'data' | 'empty' | 'timeout'.
 */
function waitForTrainingData(timeout = MODAL_TIMEOUT): Promise<'data' | 'empty' | 'timeout'> {
  const POLL_INTERVAL = 200;
  return new Promise((resolve) => {
    const deadline = Date.now() + timeout;

    function check() {
      // Check for a "no records" message anywhere in the modal
      const modal = document.querySelector(SELECTORS.training.dialog)
        ?? document.querySelector('.modal.fade.in .modal-dialog')
        ?? document.querySelector('.modal.show .modal-dialog')
        ?? document.querySelector('.modal-dialog');
      if (modal) {
        const modalText = modal.textContent ?? '';
        if (/no\s+(records?|results?|trainings?)\s+found/i.test(modalText)) {
          console.log('[IRB Checker] Modal reports no training records found');
          resolve('empty');
          return;
        }
      }

      // Check for a table with at least one data row
      const table = findTrainingTable();
      if (table) {
        const rows = table.querySelectorAll('tbody tr');
        for (const row of rows) {
          // Accept rows with either the specific class or plain td cells
          const cells = row.querySelectorAll(SELECTORS.training.dataCell);
          const fallbackCells = cells.length >= 5 ? cells : row.querySelectorAll('td');
          if (fallbackCells.length >= 5 && textOf(fallbackCells[0])) {
            console.log(`[IRB Checker] Training data loaded (${rows.length} rows in table)`);
            resolve('data');
            return;
          }
        }
      }

      if (Date.now() >= deadline) {
        console.warn('[IRB Checker] Timed out waiting for training data to load');
        resolve('timeout');
        return;
      }

      setTimeout(check, POLL_INTERVAL);
    }

    check();
  });
}

/**
 * Scrape training records from the currently open training modal.
 * The modal table has columns: Course Name, Group, Stage, Status, Completion Date, Expiration Date.
 * Every other row is a spacer (empty) and should be skipped.
 */
function scrapeTrainingModal(): ScrapedTraining[] {
  const table = findTrainingTable();
  if (!table) {
    console.warn('[IRB Checker] No training table found in modal');
    // Log what IS in the modal for debugging
    const modalContent = document.querySelector('.modal-dialog') ?? document.querySelector('.modal.fade.in');
    if (modalContent) {
      console.log(`[IRB Checker] Modal content preview: ${modalContent.innerHTML.substring(0, 500)}`);
    }
    return [];
  }

  // Log table header to verify column layout
  const headers = table.querySelectorAll('th');
  if (headers.length > 0) {
    const headerTexts = Array.from(headers).map(h => textOf(h));
    console.log(`[IRB Checker] Training table headers: [${headerTexts.join(', ')}]`);
  }

  const rows = table.querySelectorAll('tbody tr');
  console.log(`[IRB Checker] Training table has ${rows.length} row(s)`);
  const trainings: ScrapedTraining[] = [];

  for (const row of rows) {
    // Try specific selector first, fall back to plain td
    let cells = row.querySelectorAll(SELECTORS.training.dataCell);
    if (cells.length < 5) {
      cells = row.querySelectorAll('td');
    }
    // Skip spacer rows (empty rows with insufficient cells)
    if (cells.length < 5) continue;

    const courseName = textOf(cells[0]);
    const completionDate = textOf(cells[4]);
    const expirationDate = cells.length > 5 ? textOf(cells[5]) : undefined;

    if (!courseName || !completionDate) {
      if (courseName) {
        console.log(`[IRB Checker] Skipping row: course="${courseName}" but no completionDate (cell count=${cells.length}, cell[4]="${textOf(cells[4])}")`);
      }
      continue;
    }

    trainings.push({
      personnelName: '', // Will be filled in by the caller
      courseName,
      completionDate,
      expirationDate: expirationDate || undefined,
      registeredEmail: undefined, // Not shown in Cayuse training modal
      hasPdfAttachment: false, // Not shown in Cayuse training modal
    });
  }

  console.log(`[IRB Checker] Scraped ${trainings.length} training record(s) from modal`);
  return trainings;
}

/**
 * Find the training "View" button in a personnel row using multiple strategies.
 * Returns the clickable element and which strategy found it, or null.
 */
function findViewButton(row: Element): { element: HTMLElement; strategy: string } | null {
  // Strategy 1: Original selector — td.open-person-training-cell
  // The View button can be an <a>, <button>, or <div role="button">
  const trainingCell = row.querySelector(SELECTORS.personnel.trainingCell);
  const btn1 = trainingCell?.querySelector('a, button, [role="button"]') as HTMLElement | null;
  if (btn1) return { element: btn1, strategy: 'trainingCell selector' };

  // Strategy 2: Look for any link/button with "View" text in the row
  const links = row.querySelectorAll('a, button, [role="button"]');
  for (const link of links) {
    if (link.textContent?.trim().toLowerCase() === 'view') {
      return { element: link as HTMLElement, strategy: '"View" text match' };
    }
  }

  // Strategy 3: Check the last few td cells for any clickable element
  // (training/action cells are typically at the end of the row)
  const allCells = row.querySelectorAll('td');
  for (let i = allCells.length - 1; i >= Math.max(0, allCells.length - 3); i--) {
    const clickable = allCells[i].querySelector('a, button, [role="button"]') as HTMLElement | null;
    if (clickable) return { element: clickable, strategy: `cell[${i}] clickable` };
  }

  return null;
}

/**
 * Click "View" on a personnel row to open the training modal,
 * scrape the training records, then close the modal.
 */
async function scrapeTrainingsForRow(
  row: Element,
  personnelName: string,
): Promise<ScrapedTraining[]> {
  // Find the "View" link/button using multiple strategies
  const result = findViewButton(row);

  if (!result) {
    console.warn(`[IRB Checker] No View button found for ${personnelName} — tried: trainingCell selector, "View" text match, last-cell clickable. Skipping training scrape.`);
    return [];
  }

  const { element: viewButton, strategy } = result;

  // Click the View button
  viewButton.click();
  console.log(`[IRB Checker] Clicked View button for ${personnelName} (found via ${strategy}), waiting for modal...`);

  // Wait for the training modal to appear — try multiple selectors
  const dialogSelectors = [
    SELECTORS.training.dialog,         // .modal-dialog.training-finder
    '.modal.fade.in .modal-dialog',    // Bootstrap modal with any dialog
    '.modal.show .modal-dialog',       // Bootstrap 5 variant
    '.modal-dialog',                   // any modal dialog
  ];
  let modal: Element | null = null;
  for (const sel of dialogSelectors) {
    modal = await waitForElement(sel, MODAL_TIMEOUT);
    if (modal) {
      console.log(`[IRB Checker] Modal opened for ${personnelName} (matched: ${sel})`);
      break;
    }
  }
  if (!modal) {
    console.warn(`[IRB Checker] Training modal did not open for ${personnelName} — tried: ${dialogSelectors.join(', ')}`);
    return [];
  }

  // Wait for training data to actually load (AJAX), not just the modal shell
  const dataStatus = await waitForTrainingData();
  if (dataStatus === 'empty') {
    console.log(`[IRB Checker] ${personnelName}: no training records in modal`);
  } else if (dataStatus === 'timeout') {
    console.warn(`[IRB Checker] ${personnelName}: training data did not load in time`);
  }

  // Scrape training records from the modal
  const trainings = scrapeTrainingModal();

  // Tag each record with the person's name
  for (const t of trainings) {
    t.personnelName = personnelName;
  }
  console.log(`[IRB Checker] ${personnelName}: captured ${trainings.length} training record(s)`);

  // Close the modal — try multiple selectors
  const closeBtn = document.querySelector(SELECTORS.training.closeButton)
    ?? document.querySelector('.modal.show .close')
    ?? document.querySelector('.modal .btn-close')
    ?? document.querySelector('.modal .close');
  if (closeBtn) {
    (closeBtn as HTMLElement).click();
    // Wait for any modal variant to be removed
    await waitForElementRemoved(SELECTORS.training.modal);
    await waitForElementRemoved('.modal.show');
    await delay(MODAL_CYCLE_DELAY);
  } else {
    console.warn(`[IRB Checker] Could not find close button for modal after scraping ${personnelName}`);
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
  console.log(`[IRB Checker] scrapeAllTrainings: found ${containers.length} assignment containers`);
  const allTrainings: ScrapedTraining[] = [];
  const processedNames = new Set<string>();

  for (const container of containers) {
    const role = extractRoleFromContainer(container);
    if (role === 'Primary Contact') continue;

    const tables = container.querySelectorAll('table');
    for (const table of tables) {
      const rows = table.querySelectorAll('tbody tr');
      for (const row of rows) {
        // Try e3-table-row-cell first, fall back to plain td
        let isData = isDataRow(row);
        let cells = row.querySelectorAll(SELECTORS.personnel.dataCell);

        if (!isData) {
          // Fallback: try plain td cells
          const plainCells = row.querySelectorAll('td');
          if (plainCells.length >= 5 && textOf(plainCells[0])) {
            isData = true;
            cells = plainCells;
          }
        }

        if (!isData || cells.length < 5) continue;

        const name = textOf(cells[0]);
        if (!name || processedNames.has(name)) continue;
        processedNames.add(name);

        console.log(`[IRB Checker] scrapeAllTrainings: opening training modal for "${name}"`);
        const trainings = await scrapeTrainingsForRow(row, name);
        allTrainings.push(...trainings);
      }
    }
  }

  console.log(`[IRB Checker] scrapeAllTrainings: total ${allTrainings.length} training(s) collected for ${processedNames.size} person(s)`);
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
  console.log('[IRB Checker] ── Starting scrape ──────────────────────');
  console.log(`[IRB Checker] Page URL: ${window.location.href}`);

  const header = scrapeSubmissionHeader();
  console.log(`[IRB Checker] Header: title="${header.title}", protocol="${header.protocolNumber ?? 'not found'}"`);

  const personnel = scrapePersonnel();
  console.log(`[IRB Checker] Personnel found: ${personnel.length}`);
  for (const p of personnel) {
    console.log(`[IRB Checker]   - ${p.name} (${p.role}) [${p.email ?? 'no email'}]`);
  }

  const trainings = await scrapeAllTrainings();
  console.log(`[IRB Checker] Total trainings scraped: ${trainings.length}`);
  for (const t of trainings) {
    console.log(`[IRB Checker]   - ${t.personnelName}: "${t.courseName}" completed=${t.completionDate} expires=${t.expirationDate ?? 'N/A'}`);
  }
  console.log('[IRB Checker] ── Scrape complete ─────────────────────');

  return {
    submissionTitle: header.title,
    protocolNumber: header.protocolNumber,
    personnel,
    trainings,
    pageUrl: window.location.href,
  };
}

// ── Message Handling ─────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: ExtensionMessage | { type: string }, _sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ type: 'PONG' });
    return;
  }
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
