import type { Submission, ExtensionSettings } from '../types/models';

const KEYS = {
  currentSubmission: 'currentSubmission',
  submissionHistory: 'submissionHistory',
  settings: 'settings',
} as const;

const DEFAULT_SETTINGS: ExtensionSettings = {
  institutionName: '',
  institutionEmailDomains: [],
  notificationTemplate: '',
};

/** Save the current submission scan result */
export async function saveSubmission(submission: Submission): Promise<void> {
  await chrome.storage.local.set({ [KEYS.currentSubmission]: submission });

  // Also append to history
  const history = await getSubmissionHistory(submission.id);
  history.push({
    submissionId: submission.id,
    scannedAt: submission.scannedAt,
    personnel: submission.personnel,
    overallCompliant: submission.overallCompliant,
  });
  const allHistory = await getAllHistory();
  allHistory[submission.id] = history;
  await chrome.storage.local.set({ [KEYS.submissionHistory]: allHistory });
}

/** Get the most recent submission */
export async function getCurrentSubmission(): Promise<Submission | null> {
  const result = await chrome.storage.local.get(KEYS.currentSubmission);
  return result[KEYS.currentSubmission] ?? null;
}

/** Get scan history for a specific submission */
export async function getSubmissionHistory(submissionId: string): Promise<Array<{
  submissionId: string;
  scannedAt: string;
  personnel: Submission['personnel'];
  overallCompliant: boolean;
}>> {
  const allHistory = await getAllHistory();
  return allHistory[submissionId] ?? [];
}

async function getAllHistory(): Promise<Record<string, Array<{
  submissionId: string;
  scannedAt: string;
  personnel: Submission['personnel'];
  overallCompliant: boolean;
}>>> {
  const result = await chrome.storage.local.get(KEYS.submissionHistory);
  return result[KEYS.submissionHistory] ?? {};
}

/** Get extension settings */
export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...result[KEYS.settings] };
}

/** Save extension settings */
export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ [KEYS.settings]: settings });
}
