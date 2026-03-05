/**
 * Cayuse navigation module for automated workflow actions.
 *
 * Currently contains a STUB implementation for the "Return to PI" workflow.
 * The exact Cayuse UI steps are pending SME consultation.
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │ TODO: SME INPUT NEEDED                                       │
 * │                                                              │
 * │ To implement the Return-to-PI workflow, the SME must provide:│
 * │                                                              │
 * │ 1. Which page/view has the "return" action?                  │
 * │    (e.g., submission detail, review queue, action menu)      │
 * │                                                              │
 * │ 2. What button/link triggers the return dialog?              │
 * │    (CSS selector or text label)                              │
 * │                                                              │
 * │ 3. CSS selector for the comment textarea in the return form  │
 * │                                                              │
 * │ 4. CSS selector for the submit/confirm button                │
 * │                                                              │
 * │ 5. Are there any confirmation dialogs after submission?      │
 * │    (If so, what are their selectors?)                        │
 * │                                                              │
 * │ 6. Does the URL need to change (hash navigation)?            │
 * │    (e.g., from #/submission/123/form to #/submission/123/    │
 * │     actions)                                                 │
 * └──────────────────────────────────────────────────────────────┘
 */

export interface NavigationResult {
  success: boolean;
  error?: string;
}

/**
 * Public entry point for navigation requests from the service worker.
 */
export async function handleNavigationRequest(
  action: string,
  submissionId: string,
  comment: string,
): Promise<NavigationResult> {
  switch (action) {
    case 'return_to_pi':
      return executeReturnToPi(submissionId, comment);
    default:
      return { success: false, error: `Unknown navigation action: ${action}` };
  }
}

/**
 * STUB: Return-to-PI navigation.
 *
 * When implemented, this function will:
 * 1. Navigate to the submission's action/review page
 * 2. Click the "Return" button to open the return dialog
 * 3. Paste the notification text into the comment textarea
 * 4. Submit the form
 */
async function executeReturnToPi(
  _submissionId: string,
  _comment: string,
): Promise<NavigationResult> {
  return {
    success: false,
    error: 'Return-to-PI navigation is not yet configured. The Cayuse workflow for returning submissions is pending SME consultation. Please navigate manually and paste the notification text.',
  };
}

// ── Helpers (for future use) ──────────────────────────────────

/**
 * Navigate to a Cayuse hash route and wait for content to stabilize.
 * Useful for SPA hash-based navigation (e.g., #/submission/123/actions).
 */
export function navigateToHash(hash: string, timeout = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const startHash = window.location.hash;
    if (startHash === hash) {
      resolve(true);
      return;
    }

    let settled = false;
    const observer = new MutationObserver(() => {
      // Content changed after hash update — consider it settled
      if (!settled && window.location.hash === hash) {
        settled = true;
        observer.disconnect();
        resolve(true);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    window.location.hash = hash;

    setTimeout(() => {
      observer.disconnect();
      resolve(window.location.hash === hash);
    }, timeout);
  });
}

/**
 * Wait for an element matching a selector to appear in the DOM.
 * Re-exported from shared DOM utility pattern.
 */
export function waitForElement(selector: string, timeout = 5000): Promise<Element | null> {
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
