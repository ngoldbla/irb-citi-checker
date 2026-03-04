import type { Submission } from '../../types/models';
import { formatDate } from '../../lib/date-utils';

export function renderSubmissionHeader(container: HTMLElement, submission: Submission): void {
  const deficientCount = submission.personnel.filter(
    p => p.citiStatus.overallStatus !== 'compliant'
  ).length;

  container.innerHTML = `
    <div class="submission-header">
      <h2>${escapeHtml(submission.title)}</h2>
      <div class="submission-meta">
        ${submission.protocolNumber ? `<span>Protocol: ${escapeHtml(submission.protocolNumber)}</span>` : ''}
        <span>Scanned: ${formatDate(submission.scannedAt)}</span>
        <span>${submission.personnel.length} personnel</span>
      </div>
      <div class="mt-2">
        <span class="compliance-badge ${submission.overallCompliant ? 'compliant' : 'deficient'}">
          ${submission.overallCompliant ? 'All Compliant' : `${deficientCount} Deficien${deficientCount === 1 ? 'cy' : 'cies'}`}
        </span>
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
