import { describe, it, expect } from 'vitest';
import { renderNotification, DEFAULT_NOTIFICATION_TEMPLATE } from '../src/lib/notification-renderer';
import type { Submission } from '../src/types/models';

function sampleSubmission(): Submission {
  return {
    id: 'IRB-FY26-001',
    title: 'Test Study',
    protocolNumber: 'IRB-FY26-001',
    scannedAt: '2026-06-04T12:00:00.000Z',
    institutionName: 'Example University',
    overallCompliant: false,
    personnel: [
      {
        name: 'Jane Doe',
        role: 'PI',
        isHomeInstitution: true,
        email: 'jane@example.edu',
        citiStatus: {
          overallStatus: 'missing',
          trainings: [],
          deficiencies: [
            {
              type: 'no_training_found',
              description: 'No CITI record for Jane Doe.',
              recommendation: 'Jane Doe must complete CITI training.',
            },
          ],
        },
      },
      {
        name: 'Bob Roe',
        role: 'Co-PI',
        isHomeInstitution: false,
        email: 'bob@other.edu',
        citiStatus: {
          overallStatus: 'external',
          trainings: [],
          deficiencies: [
            {
              type: 'external_institution_no_pdf',
              description: 'No CITI PDF attached for Bob Roe.',
              recommendation: 'Attach Bob Roe CITI certificate PDF.',
            },
          ],
        },
      },
      {
        name: 'Pat Okay',
        role: 'Other Personnel',
        isHomeInstitution: true,
        citiStatus: { overallStatus: 'compliant', trainings: [], deficiencies: [] },
      },
    ],
  };
}

describe('renderNotification', () => {
  it('fills merge fields and lists only deficient personnel', () => {
    const out = renderNotification(sampleSubmission());
    expect(out).toContain('Dear Jane Doe,');
    expect(out).toContain('IRB-FY26-001');
    expect(out).toContain('"Test Study"');
    expect(out).toContain('Jane Doe (PI)');
    expect(out).toContain('Bob Roe (Co-PI, external)');
    expect(out).toContain('No CITI record for Jane Doe.');
    expect(out).toContain('Action: Attach Bob Roe CITI certificate PDF.');
    expect(out).not.toContain('Pat Okay'); // compliant -> excluded
  });

  it('respects a target-personnel filter', () => {
    const out = renderNotification(sampleSubmission(), DEFAULT_NOTIFICATION_TEMPLATE, ['Bob Roe']);
    expect(out).toContain('Bob Roe (Co-PI, external)');
    expect(out).not.toContain('Jane Doe (PI)');
  });

  it('substitutes a custom template', () => {
    const out = renderNotification(sampleSubmission(), 'Protocol {{protocolNumber}} for {{institutionName}}.');
    expect(out.trim()).toBe('Protocol IRB-FY26-001 for Example University.');
  });

  it('leaves unknown placeholders intact', () => {
    const out = renderNotification(sampleSubmission(), 'Hello {{unknown}}');
    expect(out).toContain('{{unknown}}');
  });
});
