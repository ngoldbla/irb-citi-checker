import type { PersonnelRecord, CitiTraining, CitiStatus, Deficiency } from '../types/models';
import type { ScrapedPersonnel, ScrapedTraining } from '../types/cayuse';
import { calculateExpirationDate, isTrainingExpired, isCompletedToday } from './date-utils';
import { resolveInstitution, isHomeInstitution, isHomeEmail, type ResolvedInstitution } from './institution';

/** Normalize a role string to the PersonnelRecord role enum */
function normalizeRole(rawRole: string): PersonnelRecord['role'] {
  const lower = rawRole.toLowerCase();
  if (lower.includes('principal investigator') || lower === 'pi') return 'PI';
  if (lower.includes('co-pi') || lower.includes('co-investigator')) return 'Co-PI';
  if (lower.includes('faculty advisor') || lower.includes('faculty sponsor')) return 'Faculty Advisor';
  return 'Other Personnel';
}

/** Build CitiTraining records from raw scraped training data */
function buildTrainingRecords(
  personnelName: string,
  trainings: ScrapedTraining[]
): CitiTraining[] {
  const matched = trainings.filter(t =>
    t.personnelName.toLowerCase().trim() === personnelName.toLowerCase().trim()
  );

  return matched.map(t => {
    const expirationDate = t.expirationDate ?? calculateExpirationDate(t.completionDate);
    return {
      courseName: t.courseName,
      completionDate: t.completionDate,
      expirationDate,
      registeredEmail: t.registeredEmail ?? '',
      isExpired: isTrainingExpired(expirationDate),
    };
  });
}

/*
 * ┌──────────────────────────────────────────────────────────────┐
 * │ DORMANT COMPLIANCE RULES — DO NOT REMOVE THESE RULES        │
 * │                                                              │
 * │ Rules 4 (email_mismatch) and 3 (external_institution_no_pdf)│
 * │ can never currently trigger for the following reasons:       │
 * │                                                              │
 * │ • Rule 4 (Email Mismatch): Requires `registeredEmail` from  │
 * │   CITI training records. The Cayuse training modal does NOT  │
 * │   display the CITI registered email. In cayuse-scraper.ts,  │
 * │   `registeredEmail` is always set to `undefined` (line ~318)│
 * │   so `citiEmail` is always empty and the mismatch check     │
 * │   never passes.                                             │
 * │                                                              │
 * │ • Rule 3 (External Without PDF): Requires `hasPdfAttachment`│
 * │   from scraped training data. The Cayuse training modal does │
 * │   NOT show PDF attachment status. In cayuse-scraper.ts,     │
 * │   `hasPdfAttachment` is always set to `false` (line ~319),  │
 * │   so every external person with training triggers this rule. │
 * │   This is currently the EXPECTED behavior — external         │
 * │   personnel should be flagged to attach their PDF.          │
 * │                                                              │
 * │ These rules are intentionally kept for future data sources   │
 * │ (e.g., CITI API integration, enhanced Cayuse scraping).     │
 * └──────────────────────────────────────────────────────────────┘
 */

/** Evaluate CITI compliance for a single person */
function evaluatePerson(
  person: ScrapedPersonnel,
  trainings: ScrapedTraining[],
  isHome: boolean,
  inst: ResolvedInstitution
): CitiStatus {
  const trainingRecords = buildTrainingRecords(person.name, trainings);
  const deficiencies: Deficiency[] = [];

  // Rule 1: No training found at all
  if (trainingRecords.length === 0) {
    // Check if external person has a PDF attachment
    const matchedScraped = trainings.filter(t =>
      t.personnelName.toLowerCase().trim() === person.name.toLowerCase().trim()
    );

    if (!isHome && matchedScraped.length === 0) {
      deficiencies.push({
        type: 'external_institution_no_pdf',
        description: `No CITI training record found for ${person.name}. As personnel external to ${inst.name}, a PDF of their CITI certificate must be attached in Cayuse.`,
        recommendation: `Request that ${person.name} provide a PDF copy of their current CITI Human Subjects Research training certificate to attach in Cayuse.`,
      });
      return { overallStatus: 'external', trainings: [], deficiencies };
    }

    deficiencies.push({
      type: 'no_training_found',
      description: `No CITI Human Subjects Research training record found for ${person.name} in Cayuse.`,
      recommendation: isHome
        ? `${person.name} must complete CITI Human Subjects Research training.`
        : `${person.name} must provide proof of current CITI Human Subjects Research training.`,
    });
    return { overallStatus: 'missing', trainings: [], deficiencies };
  }

  // Find the most recent valid Human Subjects training
  const currentTrainings = trainingRecords.filter(t => !t.isExpired);
  const expiredTrainings = trainingRecords.filter(t => t.isExpired);

  // Rule 5: Check for pending sync (completed today)
  const completedToday = trainingRecords.filter(t => isCompletedToday(t.completionDate));
  if (completedToday.length > 0 && currentTrainings.length === 0) {
    deficiencies.push({
      type: 'training_pending_sync',
      description: `CITI training for ${person.name} was completed today. The nightly sync between CITI and Cayuse has not yet run.`,
      recommendation: `Training should appear in Cayuse by tomorrow after the nightly sync. If it does not appear, ${person.name} should provide a copy of their CITI completion certificate.`,
    });
    return { overallStatus: 'pending_sync', trainings: trainingRecords, deficiencies };
  }

  // Rule 2: All training is expired
  if (currentTrainings.length === 0 && expiredTrainings.length > 0) {
    deficiencies.push({
      type: 'training_expired',
      description: `CITI Human Subjects Research training for ${person.name} has expired. Training must be current (within 3 years).`,
      recommendation: `${person.name} must complete CITI refresher training. Their most recent training expired on ${expiredTrainings[0].expirationDate}.`,
    });
    return { overallStatus: 'expired', trainings: trainingRecords, deficiencies };
  }

  // Rule 4: Email mismatch for home-institution personnel
  if (isHome && person.email) {
    const hasHomeEmailInCiti = currentTrainings.some(t =>
      t.registeredEmail && isHomeEmail(t.registeredEmail, inst)
    );
    const citiEmail = currentTrainings[0]?.registeredEmail;

    if (citiEmail && !hasHomeEmailInCiti) {
      deficiencies.push({
        type: 'email_mismatch_suspected',
        description: `${person.name}'s CITI training is registered under ${citiEmail}, but their Cayuse account uses ${person.email}. CITI training must be registered with a ${inst.name} email.`,
        recommendation: `${person.name} should log into CITI and change their email to their ${inst.name} email (${person.email}), then merge any duplicate CITI accounts. Do NOT change the Cayuse email.`,
      });
      return { overallStatus: 'email_mismatch', trainings: trainingRecords, deficiencies };
    }
  }

  // Rule 3: External personnel without PDF
  if (!isHome) {
    const matchedScraped = trainings.filter(t =>
      t.personnelName.toLowerCase().trim() === person.name.toLowerCase().trim()
    );
    const hasPdf = matchedScraped.some(t => t.hasPdfAttachment);
    if (!hasPdf) {
      deficiencies.push({
        type: 'external_institution_no_pdf',
        description: `${person.name} is from an external institution and has CITI training, but no PDF certificate is attached in Cayuse.`,
        recommendation: `Request that ${person.name} provide a PDF copy of their current CITI certificate to attach in Cayuse.`,
      });
      return { overallStatus: 'external', trainings: trainingRecords, deficiencies };
    }
  }

  // All checks passed
  return { overallStatus: 'compliant', trainings: trainingRecords, deficiencies: [] };
}

/**
 * Evaluate compliance for all personnel in a submission.
 *
 * @param institution Resolved home institution (from settings override or
 *   auto-detected from the Cayuse hostname). Defaults to an empty resolution,
 *   which treats everyone as external — callers should pass a real value.
 */
export function evaluateSubmission(
  personnel: ScrapedPersonnel[],
  trainings: ScrapedTraining[],
  institution: ResolvedInstitution = resolveInstitution(undefined)
): PersonnelRecord[] {
  return personnel.map(person => {
    const isHome = isHomeInstitution(person, institution);
    const citiStatus = evaluatePerson(person, trainings, isHome, institution);

    return {
      name: person.name,
      role: normalizeRole(person.role),
      isHomeInstitution: isHome,
      email: person.email,
      citiStatus,
    };
  });
}

/** Check if all personnel in a submission are compliant */
export function isSubmissionCompliant(personnel: PersonnelRecord[]): boolean {
  return personnel.every(p => p.citiStatus.overallStatus === 'compliant');
}
