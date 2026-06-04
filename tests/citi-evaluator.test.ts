import { describe, it, expect } from 'vitest';
import { evaluateSubmission, isSubmissionCompliant } from '../src/lib/citi-evaluator';
import { resolveInstitution } from '../src/lib/institution';
import type { ScrapedPersonnel, ScrapedTraining } from '../src/types/cayuse';

const inst = resolveInstitution('example-irb.cayuse.com'); // token "example"

/** ISO date N years from now (negative = past). Large margins keep this TZ-stable. */
function isoYearsFromNow(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

const homePerson: ScrapedPersonnel = {
  name: 'Jane Doe',
  role: 'Principal Investigator',
  email: 'jane@example.edu',
  institution: 'Example University',
};

describe('evaluateSubmission', () => {
  it('classifies home personnel and flags missing training', () => {
    const result = evaluateSubmission([homePerson], [], inst);
    expect(result[0].isHomeInstitution).toBe(true);
    expect(result[0].role).toBe('PI');
    expect(result[0].citiStatus.overallStatus).toBe('missing');
    expect(result[0].citiStatus.deficiencies[0].type).toBe('no_training_found');
  });

  it('classifies external personnel and flags a missing PDF', () => {
    const external: ScrapedPersonnel = {
      name: 'Bob Roe',
      role: 'Co-Investigator',
      email: 'bob@other.edu',
      institution: 'Other University',
    };
    const result = evaluateSubmission([external], [], inst);
    expect(result[0].isHomeInstitution).toBe(false);
    expect(result[0].citiStatus.overallStatus).toBe('external');
    expect(result[0].citiStatus.deficiencies[0].type).toBe('external_institution_no_pdf');
    // Genericized wording must not mention any specific institution shorthand.
    expect(result[0].citiStatus.deficiencies[0].description).toContain('Example');
    expect(result[0].citiStatus.deficiencies[0].description.toLowerCase()).not.toContain('ksu');
  });

  it('marks current training as compliant', () => {
    const trainings: ScrapedTraining[] = [
      {
        personnelName: 'Jane Doe',
        courseName: 'Human Subjects Research',
        completionDate: isoYearsFromNow(-1),
        expirationDate: isoYearsFromNow(2),
        hasPdfAttachment: false,
      },
    ];
    const result = evaluateSubmission([homePerson], trainings, inst);
    expect(result[0].citiStatus.overallStatus).toBe('compliant');
    expect(isSubmissionCompliant(result)).toBe(true);
  });

  it('flags expired training', () => {
    const trainings: ScrapedTraining[] = [
      {
        personnelName: 'Jane Doe',
        courseName: 'Human Subjects Research',
        completionDate: isoYearsFromNow(-5),
        expirationDate: isoYearsFromNow(-2),
        hasPdfAttachment: false,
      },
    ];
    const result = evaluateSubmission([homePerson], trainings, inst);
    expect(result[0].citiStatus.overallStatus).toBe('expired');
    expect(result[0].citiStatus.deficiencies[0].type).toBe('training_expired');
    expect(isSubmissionCompliant(result)).toBe(false);
  });
});
