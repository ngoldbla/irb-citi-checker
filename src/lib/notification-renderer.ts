import type { PersonnelRecord, Submission } from '../types/models';

/**
 * Deterministic, offline notification rendering.
 *
 * This replaces the former LLM-based draft generation. The compliance evaluator
 * already produces a human-readable `description` and `recommendation` for every
 * deficiency, so composing the PI message is a pure templating step — no model,
 * no network, fully testable.
 *
 * The message is built by merging fields into a user-editable template. The
 * `{{deficiencies}}` field expands to one block per flagged person, assembled
 * from the evaluator's structured output. Staff paste the result into Cayuse's
 * "Missing information or materials" field (or any correspondence) themselves.
 */

/** Built-in template used when the user has not saved a custom one. */
export const DEFAULT_NOTIFICATION_TEMPLATE = `Dear {{piName}},

Regarding CITI Human Subjects Research training compliance for IRB protocol {{protocolNumber}} ("{{submissionTitle}}"), the following personnel have outstanding items that must be resolved before this submission can proceed:

{{deficiencies}}

If any listed individual believes they have already completed this training, please ask them to provide a copy of their CITI completion certificate.

Please address these items and resubmit at your earliest convenience.

Sincerely,
Research Compliance`;

/** Merge-field names available in the notification template. */
export const TEMPLATE_FIELDS = [
  'piName',
  'protocolNumber',
  'submissionTitle',
  'institutionName',
  'date',
  'deficiencies',
] as const;

/** Render a PI notification from a submission using the given template. */
export function renderNotification(
  submission: Submission,
  template: string = DEFAULT_NOTIFICATION_TEMPLATE,
  targetPersonnel?: string[]
): string {
  const deficient = selectDeficient(submission.personnel, targetPersonnel);
  const pi = submission.personnel.find(p => p.role === 'PI');

  const fields: Record<string, string> = {
    piName: pi?.name ?? 'Principal Investigator',
    protocolNumber: submission.protocolNumber ?? submission.id,
    submissionTitle: submission.title,
    institutionName: submission.institutionName ?? 'the institution',
    date: formatToday(submission.scannedAt),
    deficiencies: renderDeficiencyBlock(deficient),
  };

  return applyTemplate(template, fields).trim() + '\n';
}

/** Filter personnel to those with deficiencies, optionally narrowed to a target set. */
function selectDeficient(
  personnel: PersonnelRecord[],
  targetPersonnel?: string[]
): PersonnelRecord[] {
  return personnel.filter(p => {
    if (p.citiStatus.overallStatus === 'compliant') return false;
    if (targetPersonnel && targetPersonnel.length > 0) {
      return targetPersonnel.includes(p.name);
    }
    return true;
  });
}

/** Build the per-person deficiency block from structured evaluator output. */
function renderDeficiencyBlock(personnel: PersonnelRecord[]): string {
  if (personnel.length === 0) {
    return 'No outstanding CITI compliance items.';
  }

  return personnel
    .map(person => {
      const tag = person.isHomeInstitution ? '' : ', external';
      const lines = [`• ${person.name} (${person.role}${tag})`];
      for (const d of person.citiStatus.deficiencies) {
        lines.push(`    ${d.description}`);
        lines.push(`    Action: ${d.recommendation}`);
      }
      return lines.join('\n');
    })
    .join('\n\n');
}

/** Replace {{field}} placeholders; unknown placeholders are left intact. */
function applyTemplate(template: string, fields: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in fields ? fields[key] : match
  );
}

/** Format the scan timestamp (or today) as a readable date. */
function formatToday(scannedAt?: string): string {
  const date = scannedAt ? new Date(scannedAt) : new Date();
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
