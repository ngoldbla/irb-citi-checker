/** Deficiency types identified during CITI compliance checks */
export type DeficiencyType =
  | 'no_training_found'
  | 'training_expired'
  | 'external_institution_no_pdf'
  | 'email_mismatch_suspected'
  | 'training_pending_sync';

/** A single CITI training record */
export interface CitiTraining {
  courseName: string;
  completionDate: string; // ISO date
  expirationDate: string; // ISO date (completionDate + 3 years)
  registeredEmail: string;
  isExpired: boolean;
}

/** A compliance deficiency for a specific person */
export interface Deficiency {
  type: DeficiencyType;
  description: string;
  recommendation: string;
}

/** CITI compliance status for one person */
export interface CitiStatus {
  overallStatus: 'compliant' | 'expired' | 'missing' | 'external' | 'email_mismatch' | 'pending_sync';
  trainings: CitiTraining[];
  deficiencies: Deficiency[];
}

/** A person listed on an IRB submission */
export interface PersonnelRecord {
  name: string;
  role: 'PI' | 'Co-PI' | 'Faculty Advisor' | 'Other Personnel';
  /** True when this person belongs to the home institution (vs. an external collaborator). */
  isHomeInstitution: boolean;
  email?: string;
  citiStatus: CitiStatus;
}

/** An IRB submission being reviewed */
export interface Submission {
  id: string;
  title: string;
  protocolNumber?: string;
  scannedAt: string; // ISO timestamp
  /** Resolved home-institution display name at scan time (auto-detected or configured). */
  institutionName?: string;
  personnel: PersonnelRecord[];
  overallCompliant: boolean;
}

/** History entry for resubmission tracking */
export interface SubmissionScan {
  submissionId: string;
  scannedAt: string;
  personnel: PersonnelRecord[];
  overallCompliant: boolean;
}

/**
 * Extension settings stored in chrome.storage.local.
 *
 * All fields are optional in effect: when left blank, the extension auto-detects
 * the institution from the Cayuse web address and uses the built-in notification
 * template. No API keys or external services are involved — everything runs locally.
 */
export interface ExtensionSettings {
  /** Manual override for the home-institution display name. Blank = auto-detect. */
  institutionName: string;
  /** Manual override for home email domains (e.g. ["example.edu"]). Blank = auto-detect. */
  institutionEmailDomains: string[];
  /** User-editable PI notification template with merge fields. Blank = built-in default. */
  notificationTemplate: string;
}

/** Badge color mapping for status display */
export const STATUS_COLORS: Record<CitiStatus['overallStatus'], string> = {
  compliant: '#22c55e',
  expired: '#ef4444',
  missing: '#ef4444',
  external: '#f59e0b',
  email_mismatch: '#f59e0b',
  pending_sync: '#3b82f6',
};
