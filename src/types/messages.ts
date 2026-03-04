import type { PersonnelRecord, Submission, ExtensionSettings } from './models';
import type { ScrapedSubmissionData } from './cayuse';

// ── Content Script → Service Worker ──────────────────────────

export interface ScrapeResultMessage {
  type: 'SCRAPE_RESULT';
  data: ScrapedSubmissionData;
}

export interface ScrapeErrorMessage {
  type: 'SCRAPE_ERROR';
  error: string;
}

export interface PageDetectedMessage {
  type: 'PAGE_DETECTED';
  pageType: 'submission' | 'personnel' | 'training' | 'unknown';
  url: string;
}

// ── Service Worker → Content Script ──────────────────────────

export interface RequestScrapeMessage {
  type: 'REQUEST_SCRAPE';
}

// ── Sidepanel → Service Worker ───────────────────────────────

export interface TriggerScanMessage {
  type: 'TRIGGER_SCAN';
}

export interface GenerateNotificationMessage {
  type: 'GENERATE_NOTIFICATION';
  submissionId: string;
  personnelNames?: string[];
}

export interface GetSubmissionMessage {
  type: 'GET_SUBMISSION';
  submissionId?: string;
}

export interface GetSettingsMessage {
  type: 'GET_SETTINGS';
}

export interface SaveSettingsMessage {
  type: 'SAVE_SETTINGS';
  settings: ExtensionSettings;
}

// ── Service Worker → Sidepanel ───────────────────────────────

export interface ScanCompleteMessage {
  type: 'SCAN_COMPLETE';
  submission: Submission;
}

export interface ScanErrorMessage {
  type: 'SCAN_ERROR';
  error: string;
}

export interface NotificationDraftMessage {
  type: 'NOTIFICATION_DRAFT';
  draft: string;
  submissionId: string;
}

export interface NotificationErrorMessage {
  type: 'NOTIFICATION_ERROR';
  error: string;
}

export interface SettingsResponseMessage {
  type: 'SETTINGS_RESPONSE';
  settings: ExtensionSettings;
}

export interface SubmissionResponseMessage {
  type: 'SUBMISSION_RESPONSE';
  submission: Submission | null;
}

export interface EvaluationUpdateMessage {
  type: 'EVALUATION_UPDATE';
  personnel: PersonnelRecord[];
  overallCompliant: boolean;
}

// ── Union types ──────────────────────────────────────────────

export type ContentToBackgroundMessage =
  | ScrapeResultMessage
  | ScrapeErrorMessage
  | PageDetectedMessage;

export type BackgroundToContentMessage =
  | RequestScrapeMessage;

export type SidepanelToBackgroundMessage =
  | TriggerScanMessage
  | GenerateNotificationMessage
  | GetSubmissionMessage
  | GetSettingsMessage
  | SaveSettingsMessage;

export type BackgroundToSidepanelMessage =
  | ScanCompleteMessage
  | ScanErrorMessage
  | NotificationDraftMessage
  | NotificationErrorMessage
  | SettingsResponseMessage
  | SubmissionResponseMessage
  | EvaluationUpdateMessage;

export type ExtensionMessage =
  | ContentToBackgroundMessage
  | BackgroundToContentMessage
  | SidepanelToBackgroundMessage
  | BackgroundToSidepanelMessage;
