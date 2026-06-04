import type { ExtensionMessage } from '../types/messages';
import type { Submission, ExtensionSettings } from '../types/models';
import { DEFAULT_NOTIFICATION_TEMPLATE } from '../lib/notification-renderer';
import { renderSubmissionHeader } from './components/submission-header';
import { renderPersonnelList } from './components/personnel-list';
import { renderDeficiencyReport } from './components/deficiency-report';
import { renderNotificationDraft, renderDraftGenerating, renderNotificationPrompt } from './components/notification-draft';
import { renderScanProgress } from './components/scan-progress';
import type { ScanProgressMessage } from '../types/messages';

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
const scanProgress = $('scan-progress');
const spinner = loading.querySelector('.spinner') as HTMLElement;
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
  spinner.classList.remove('hidden');
  loadingText.classList.remove('hidden');
  scanProgress.classList.add('hidden');
  loading.classList.remove('hidden');
}

function hideLoading(): void {
  loading.classList.add('hidden');
  scanProgress.classList.add('hidden');
}

function showSubmission(submission: Submission, autoGenerate = false): void {
  currentSubmission = submission;
  emptyState.classList.add('hidden');
  submissionView.classList.remove('hidden');

  renderSubmissionHeader(submissionHeader, submission);
  renderPersonnelList(personnelList, submission.personnel);
  renderDeficiencyReport(deficiencyReport, submission);

  if (!submission.overallCompliant) {
    notificationSection.classList.remove('hidden');
    notificationDraft.innerHTML = '';
    if (autoGenerate) {
      autoGenerateNotification(submission);
    } else {
      // Show a CTA prompt instead of auto-generating when restoring on panel reload
      renderNotificationPrompt(notificationDraft, () => {
        if (currentSubmission) autoGenerateNotification(currentSubmission);
      });
    }
  } else {
    notificationSection.classList.add('hidden');
    notificationDraft.innerHTML = '';
  }
}

function showError(message: string): void {
  const toast = document.createElement('div');
  toast.className = 'toast toast-error';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function showToast(message: string): void {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ── Event Handlers ───────────────────────────────────────────

// Shared scan handler (used by both Scan and Rescan buttons)
async function handleScan(): Promise<void> {
  showLoading('Scanning Cayuse personnel...');
  try {
    const response = await sendMessage({ type: 'TRIGGER_SCAN' });
    if (response.type === 'SCAN_COMPLETE') {
      showSubmission(response.submission, true);
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

// Auto-generate notification when deficiencies are found
async function autoGenerateNotification(submission: Submission): Promise<void> {
  renderDraftGenerating(notificationDraft);
  try {
    const response = await sendMessage({
      type: 'GENERATE_NOTIFICATION',
      submissionId: submission.id,
    });
    if (response.type === 'NOTIFICATION_DRAFT') {
      renderNotificationDraft(notificationDraft, response.draft);
      bindDraftButtons();
    } else if (response.type === 'NOTIFICATION_ERROR') {
      showError(response.error);
      notificationDraft.innerHTML = '';
    }
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to generate notification');
    notificationDraft.innerHTML = '';
  }
}

// Bind event listeners for buttons inside the draft component
function bindDraftButtons(): void {
  // Regenerate button — re-renders the message from the (possibly edited) template
  document.getElementById('btn-regenerate')?.addEventListener('click', () => {
    if (currentSubmission) autoGenerateNotification(currentSubmission);
  });
}


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

// Reset the notification template to the built-in default
$('btn-reset-template').addEventListener('click', () => {
  ($<HTMLTextAreaElement>('notification-template')).value = DEFAULT_NOTIFICATION_TEMPLATE;
});

// Settings form
$<HTMLFormElement>('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const settings: ExtensionSettings = {
    institutionName: ($<HTMLInputElement>('institution-name')).value.trim(),
    institutionEmailDomains: parseDomains(($<HTMLInputElement>('institution-domains')).value),
    notificationTemplate: ($<HTMLTextAreaElement>('notification-template')).value,
  };
  await sendMessage({ type: 'SAVE_SETTINGS', settings });
  settingsModal.classList.add('hidden');
  showToast('Settings saved');
});

function parseDomains(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
}

function populateSettings(settings: ExtensionSettings): void {
  ($<HTMLInputElement>('institution-name')).value = settings.institutionName ?? '';
  ($<HTMLInputElement>('institution-domains')).value = (settings.institutionEmailDomains ?? []).join(', ');
  ($<HTMLTextAreaElement>('notification-template')).value =
    settings.notificationTemplate?.trim() ? settings.notificationTemplate : DEFAULT_NOTIFICATION_TEMPLATE;
}

// ── Broadcast Listeners ──────────────────────────────────

chrome.runtime.onMessage.addListener((message: { type: string } & Record<string, unknown>) => {
  if (message.type === 'SCAN_PROGRESS') {
    const msg = message as unknown as ScanProgressMessage;
    // Replace spinner with progress — progress becomes the main visual
    spinner.classList.add('hidden');
    loadingText.classList.add('hidden');
    scanProgress.classList.remove('hidden');
    renderScanProgress(scanProgress, msg);
  }
});

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
