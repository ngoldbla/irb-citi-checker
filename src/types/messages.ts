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

// ── Content Script → Sidepanel (via service worker relay) ────

export interface ScanProgressMessage {
  type: 'SCAN_PROGRESS';
  current: number;       // 1-based index
  total: number;
  personnelName: string;
  phase: 'scanning_personnel' | 'opening_modal' | 'scraping_training' | 'closing_modal';
}

// ── Sidepanel → Service Worker (navigation) ─────────────────

export interface ReturnToPiMessage {
  type: 'RETURN_TO_PI';
  submissionId: string;
  comment: string;
}

// ── Service Worker → Content Script (navigation) ────────────

export interface RequestNavigateMessage {
  type: 'REQUEST_NAVIGATE';
  action: 'return_to_pi';
  submissionId: string;
  comment: string;
}

// ── Content Script → Service Worker (navigation result) ─────

export interface NavigateResultMessage {
  type: 'NAVIGATE_RESULT';
  success: boolean;
  error?: string;
}

// ── Service Worker → Sidepanel (navigation status) ──────────

export interface NavigateStatusMessage {
  type: 'NAVIGATE_STATUS';
  success: boolean;
  error?: string;
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
  | PageDetectedMessage
  | ScanProgressMessage
  | NavigateResultMessage;

export type BackgroundToContentMessage =
  | RequestScrapeMessage
  | RequestNavigateMessage;

export type SidepanelToBackgroundMessage =
  | TriggerScanMessage
  | GenerateNotificationMessage
  | GetSubmissionMessage
  | GetSettingsMessage
  | SaveSettingsMessage
  | ReturnToPiMessage;

export type BackgroundToSidepanelMessage =
  | ScanCompleteMessage
  | ScanErrorMessage
  | NotificationDraftMessage
  | NotificationErrorMessage
  | SettingsResponseMessage
  | SubmissionResponseMessage
  | EvaluationUpdateMessage
  | ScanProgressMessage
  | NavigateStatusMessage;

export type ExtensionMessage =
  | ContentToBackgroundMessage
  | BackgroundToContentMessage
  | SidepanelToBackgroundMessage
  | BackgroundToSidepanelMessage;
