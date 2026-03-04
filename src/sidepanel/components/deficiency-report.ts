import type { Submission, DeficiencyType } from '../../types/models';

const TYPE_COLORS: Record<DeficiencyType, string> = {
  no_training_found: 'var(--danger)',
  training_expired: 'var(--danger)',
  external_institution_no_pdf: 'var(--warning)',
  email_mismatch_suspected: 'var(--warning)',
  training_pending_sync: 'var(--info)',
};

const TYPE_LABELS: Record<DeficiencyType, string> = {
  no_training_found: 'No Training',
  training_expired: 'Expired',
  external_institution_no_pdf: 'External - No PDF',
  email_mismatch_suspected: 'Email Mismatch',
  training_pending_sync: 'Pending Sync',
};

export function renderDeficiencyReport(container: HTMLElement, submission: Submission): void {
  const deficient = submission.personnel.filter(
    p => p.citiStatus.overallStatus !== 'compliant'
  );

  if (deficient.length === 0) {
    container.innerHTML = '';
    return;
  }

  // Count by type
  const counts = new Map<DeficiencyType, number>();
  for (const person of deficient) {
    for (const d of person.citiStatus.deficiencies) {
      counts.set(d.type, (counts.get(d.type) ?? 0) + 1);
    }
  }

  const countsHtml = Array.from(counts.entries())
    .map(([type, count]) => `
      <div class="count-item">
        <span class="count-dot" style="background: ${TYPE_COLORS[type]}"></span>
        <span>${TYPE_LABELS[type]}: ${count}</span>
      </div>
    `)
    .join('');

  container.innerHTML = `
    <div class="deficiency-report">
      <h3>Deficiency Summary</h3>
      <div class="deficiency-summary">
        <div class="deficiency-count">
          ${countsHtml}
        </div>
      </div>
    </div>
  `;
}
