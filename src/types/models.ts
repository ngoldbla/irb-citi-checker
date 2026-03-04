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
  isKsuPersonnel: boolean;
  email?: string;
  citiStatus: CitiStatus;
}

/** An IRB submission being reviewed */
export interface Submission {
  id: string;
  title: string;
  protocolNumber?: string;
  scannedAt: string; // ISO timestamp
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

/** Extension settings stored in chrome.storage */
export interface ExtensionSettings {
  portkeyApiKey: string;
  portkeyBaseUrl: string;
  llmModel: string;
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
