import type { ExtensionMessage } from '../types/messages';
import type { Submission } from '../types/models';
import { evaluateSubmission, isSubmissionCompliant } from '../lib/citi-evaluator';
import { chatCompletion } from '../lib/llm-client';
import { buildNotificationPrompt } from '../lib/notification-templates';
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

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
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

const CAYUSE_DOMAINS = ['kennesaw-irb.cayuse.com', 'kennesaw.app.cayuse.com', 'kennesaw-irb.app.cayuse.com'];

function isCayuseTab(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname;
    return CAYUSE_DOMAINS.some((d) => hostname === d);
  } catch {
    return false;
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

    // Evaluate compliance
    const personnel = evaluateSubmission(scrapedData.personnel, scrapedData.trainings);
    const overallCompliant = isSubmissionCompliant(personnel);

    const submission: Submission = {
      id: scrapedData.protocolNumber ?? `scan-${Date.now()}`,
      title: scrapedData.submissionTitle || 'Untitled Submission',
      protocolNumber: scrapedData.protocolNumber,
      scannedAt: new Date().toISOString(),
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
    if (!settings.portkeyApiKey || !settings.portkeyBaseUrl) {
      return {
        type: 'NOTIFICATION_ERROR',
        error: 'LLM API not configured. Please set your Portkey API key and base URL in Settings.',
      };
    }

    const { system, user } = buildNotificationPrompt(submission, personnelNames);

    const draft = await chatCompletion(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      settings
    );

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
  settings: { portkeyApiKey: string; portkeyBaseUrl: string; llmModel: string }
): Promise<ExtensionMessage> {
  await saveSettings(settings);
  return { type: 'SETTINGS_RESPONSE', settings };
}
