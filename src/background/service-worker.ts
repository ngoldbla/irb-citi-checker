import type { ExtensionMessage } from '../types/messages';
import type { ExtensionSettings, Submission } from '../types/models';
import { evaluateSubmission, isSubmissionCompliant } from '../lib/citi-evaluator';
import { resolveInstitution } from '../lib/institution';
import { renderNotification, DEFAULT_NOTIFICATION_TEMPLATE } from '../lib/notification-renderer';
import { saveSubmission, getCurrentSubmission, getSettings, saveSettings } from '../lib/storage';

// ── Sidepanel Setup ──────────────────────────────────────────

// Open sidepanel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Enable sidepanel on all tabs
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// ── Message Hub ──────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: ExtensionMessage | { type: string }, sender, sendResponse) => {
  // Fire-and-forget broadcasts — relay to sidepanel without response
  if (message.type === 'SCAN_PROGRESS') {
    chrome.runtime.sendMessage(message).catch(() => {});
    return;
  }

  handleMessage(message as ExtensionMessage, sender).then(sendResponse);
  return true; // async response
});

async function handleMessage(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender
): Promise<ExtensionMessage> {
  switch (message.type) {
    case 'TRIGGER_SCAN':
      return handleTriggerScan();

    case 'GENERATE_NOTIFICATION':
      return handleGenerateNotification(message.submissionId, message.personnelNames);

    case 'GET_SUBMISSION':
      return handleGetSubmission();

    case 'GET_SETTINGS':
      return handleGetSettings();

    case 'SAVE_SETTINGS':
      return handleSaveSettings(message.settings);

    case 'RETURN_TO_PI':
      return handleReturnToPi(message.submissionId, message.comment);

    case 'PAGE_DETECTED':
      // Content script notifying about page type - no response needed
      return { type: 'SETTINGS_RESPONSE', settings: await getSettings() };

    case 'SCRAPE_RESULT':
    case 'SCRAPE_ERROR':
      // These are handled as responses to REQUEST_SCRAPE, not as direct messages
      return { type: 'SCAN_ERROR', error: 'Unexpected message' };

    default:
      return { type: 'SCAN_ERROR', error: `Unknown message type` };
  }
}

// ── Helpers ───────────────────────────────────────────────────

/**
 * Cayuse is a single SaaS vendor: every institution's tenant lives under
 * *.cayuse.com (e.g. yourschool-irb.cayuse.com, yourschool.app.cayuse.com).
 * A hostname-suffix check makes the extension work at any institution with no
 * per-site configuration — matching the broad host permission in manifest.json.
 */
function isCayuseTab(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === 'cayuse.com' || hostname.endsWith('.cayuse.com');
  } catch {
    return false;
  }
}

function safeHostname(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

async function ensureContentScript(tabId: number): Promise<void> {
  // Check if content script is already active before injecting
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    return; // Content script already active
  } catch {
    // Not active — inject it
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-script.js'],
    });
  }
}

// ── Scan Handler ─────────────────────────────────────────────

async function handleTriggerScan(): Promise<ExtensionMessage> {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      return { type: 'SCAN_ERROR', error: 'No active tab found.' };
    }

    // Validate tab URL is a Cayuse domain
    if (!isCayuseTab(tab.url)) {
      return {
        type: 'SCAN_ERROR',
        error: 'Please navigate to a Cayuse submission page first.',
      };
    }

    // Ensure content script is injected (idempotent — re-injection just re-registers listeners)
    await ensureContentScript(tab.id);

    // Send scrape request to content script
    let response: ExtensionMessage;
    try {
      response = await chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_SCRAPE' });
    } catch {
      return {
        type: 'SCAN_ERROR',
        error: 'Could not reach the Cayuse page. Please reload the page and try again.',
      };
    }

    if (response.type === 'SCRAPE_ERROR') {
      return { type: 'SCAN_ERROR', error: response.error };
    }

    if (response.type !== 'SCRAPE_RESULT' || !response.data) {
      return { type: 'SCAN_ERROR', error: 'Invalid response from content script.' };
    }

    const scrapedData = response.data;

    // Resolve the home institution: an explicit Settings override wins, otherwise
    // auto-detect from the Cayuse hostname (e.g. "yourschool-irb.cayuse.com").
    const settings = await getSettings();
    const institution = resolveInstitution(safeHostname(tab.url), {
      name: settings.institutionName,
      emailDomains: settings.institutionEmailDomains,
    });

    // Evaluate compliance
    const personnel = evaluateSubmission(scrapedData.personnel, scrapedData.trainings, institution);
    const overallCompliant = isSubmissionCompliant(personnel);

    const submission: Submission = {
      id: scrapedData.protocolNumber ?? `scan-${Date.now()}`,
      title: scrapedData.submissionTitle || 'Untitled Submission',
      protocolNumber: scrapedData.protocolNumber,
      scannedAt: new Date().toISOString(),
      institutionName: institution.name,
      personnel,
      overallCompliant,
    };

    // Persist
    await saveSubmission(submission);

    return { type: 'SCAN_COMPLETE', submission };
  } catch (err) {
    return {
      type: 'SCAN_ERROR',
      error: err instanceof Error ? err.message : 'Scan failed unexpectedly.',
    };
  }
}

// ── Return to PI Handler ─────────────────────────────────

async function handleReturnToPi(
  submissionId: string,
  comment: string,
): Promise<ExtensionMessage> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      return { type: 'NAVIGATE_STATUS', success: false, error: 'No active tab found.' };
    }

    if (!isCayuseTab(tab.url)) {
      return {
        type: 'NAVIGATE_STATUS',
        success: false,
        error: 'Please navigate to a Cayuse page first.',
      };
    }

    await ensureContentScript(tab.id);

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'REQUEST_NAVIGATE',
      action: 'return_to_pi',
      submissionId,
      comment,
    });

    return {
      type: 'NAVIGATE_STATUS',
      success: response.success ?? false,
      error: response.error,
    };
  } catch (err) {
    return {
      type: 'NAVIGATE_STATUS',
      success: false,
      error: err instanceof Error ? err.message : 'Return to PI failed.',
    };
  }
}

// ── Notification Handler ─────────────────────────────────────

async function handleGenerateNotification(
  submissionId: string,
  personnelNames?: string[]
): Promise<ExtensionMessage> {
  try {
    const submission = await getCurrentSubmission();
    if (!submission || submission.id !== submissionId) {
      return { type: 'NOTIFICATION_ERROR', error: 'Submission not found. Please scan first.' };
    }

    const settings = await getSettings();
    const template = settings.notificationTemplate?.trim()
      ? settings.notificationTemplate
      : DEFAULT_NOTIFICATION_TEMPLATE;

    const draft = renderNotification(submission, template, personnelNames);

    return { type: 'NOTIFICATION_DRAFT', draft, submissionId };
  } catch (err) {
    return {
      type: 'NOTIFICATION_ERROR',
      error: err instanceof Error ? err.message : 'Failed to generate notification.',
    };
  }
}

// ── Data Handlers ────────────────────────────────────────────

async function handleGetSubmission(): Promise<ExtensionMessage> {
  const submission = await getCurrentSubmission();
  return { type: 'SUBMISSION_RESPONSE', submission };
}

async function handleGetSettings(): Promise<ExtensionMessage> {
  const settings = await getSettings();
  return { type: 'SETTINGS_RESPONSE', settings };
}

async function handleSaveSettings(
  settings: ExtensionSettings
): Promise<ExtensionMessage> {
  await saveSettings(settings);
  return { type: 'SETTINGS_RESPONSE', settings };
}
