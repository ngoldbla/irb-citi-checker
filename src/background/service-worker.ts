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

// ── Scan Handler ─────────────────────────────────────────────

async function handleTriggerScan(): Promise<ExtensionMessage> {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      return { type: 'SCAN_ERROR', error: 'No active tab found.' };
    }

    // Send scrape request to content script
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_SCRAPE' });

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
