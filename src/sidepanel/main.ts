import type { ExtensionMessage } from '../types/messages';
import type { Submission, ExtensionSettings } from '../types/models';
import { renderSubmissionHeader } from './components/submission-header';
import { renderPersonnelList } from './components/personnel-list';
import { renderDeficiencyReport } from './components/deficiency-report';
import { renderNotificationDraft } from './components/notification-draft';

// ── DOM Elements ─────────────────────────────────────────────

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const emptyState = $('empty-state');
const submissionView = $('submission-view');
const submissionHeader = $('submission-header');
const personnelList = $('personnel-list');
const deficiencyReport = $('deficiency-report');
const notificationSection = $('notification-section');
const notificationDraft = $('notification-draft');
const loading = $('loading');
const loadingText = $('loading-text');
const settingsModal = $('settings-modal');

// ── State ────────────────────────────────────────────────────

let currentSubmission: Submission | null = null;

// ── Message Helpers ──────────────────────────────────────────

function sendMessage(message: ExtensionMessage): Promise<ExtensionMessage> {
  return chrome.runtime.sendMessage(message);
}

// ── UI Helpers ───────────────────────────────────────────────

function showLoading(text: string): void {
  loadingText.textContent = text;
  loading.classList.remove('hidden');
}

function hideLoading(): void {
  loading.classList.add('hidden');
}

function showSubmission(submission: Submission): void {
  currentSubmission = submission;
  emptyState.classList.add('hidden');
  submissionView.classList.remove('hidden');

  renderSubmissionHeader(submissionHeader, submission);
  renderPersonnelList(personnelList, submission.personnel);
  renderDeficiencyReport(deficiencyReport, submission);

  // Show notification button only if there are deficiencies
  if (!submission.overallCompliant) {
    notificationSection.classList.remove('hidden');
  } else {
    notificationSection.classList.add('hidden');
  }

  // Clear any previous draft
  notificationDraft.innerHTML = '';
}

function showError(message: string): void {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// ── Event Handlers ───────────────────────────────────────────

// Shared scan handler (used by both Scan and Rescan buttons)
async function handleScan(): Promise<void> {
  showLoading('Scanning Cayuse personnel...');
  try {
    const response = await sendMessage({ type: 'TRIGGER_SCAN' });
    if (response.type === 'SCAN_COMPLETE') {
      showSubmission(response.submission);
    } else if (response.type === 'SCAN_ERROR') {
      showError(response.error);
    }
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Scan failed');
  } finally {
    hideLoading();
  }
}

// Scan button
$('btn-scan').addEventListener('click', handleScan);

// Rescan button
$('btn-rescan').addEventListener('click', handleScan);

// Generate notification button
$('btn-generate').addEventListener('click', async () => {
  if (!currentSubmission) return;

  showLoading('Generating notification draft...');
  try {
    const response = await sendMessage({
      type: 'GENERATE_NOTIFICATION',
      submissionId: currentSubmission.id,
    });
    if (response.type === 'NOTIFICATION_DRAFT') {
      renderNotificationDraft(notificationDraft, response.draft);
    } else if (response.type === 'NOTIFICATION_ERROR') {
      showError(response.error);
    }
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to generate notification');
  } finally {
    hideLoading();
  }
});

// Settings modal
$('btn-settings').addEventListener('click', async () => {
  const response = await sendMessage({ type: 'GET_SETTINGS' });
  if (response.type === 'SETTINGS_RESPONSE') {
    populateSettings(response.settings);
  }
  settingsModal.classList.remove('hidden');
});

$('btn-close-settings').addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

// Settings form
$<HTMLFormElement>('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const settings: ExtensionSettings = {
    portkeyBaseUrl: ($<HTMLInputElement>('portkey-base-url')).value,
    portkeyApiKey: ($<HTMLInputElement>('portkey-api-key')).value,
    llmModel: ($<HTMLInputElement>('llm-model')).value || 'gpt-5.2',
  };
  await sendMessage({ type: 'SAVE_SETTINGS', settings });
  settingsModal.classList.add('hidden');

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = 'Settings saved';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
});

function populateSettings(settings: ExtensionSettings): void {
  ($<HTMLInputElement>('portkey-base-url')).value = settings.portkeyBaseUrl;
  ($<HTMLInputElement>('portkey-api-key')).value = settings.portkeyApiKey;
  ($<HTMLInputElement>('llm-model')).value = settings.llmModel;
}

// ── Init ─────────────────────────────────────────────────────

async function init(): Promise<void> {
  // Load last submission if available
  try {
    const response = await sendMessage({ type: 'GET_SUBMISSION' });
    if (response.type === 'SUBMISSION_RESPONSE' && response.submission) {
      showSubmission(response.submission);
    }
  } catch {
    // First load, no previous data
  }
}

init();
