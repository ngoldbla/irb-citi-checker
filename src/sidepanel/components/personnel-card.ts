import type { PersonnelRecord } from '../../types/models';
import { renderStatusBadge } from './status-badge';
import { formatDate } from '../../lib/date-utils';

export function renderPersonnelCard(person: PersonnelRecord): string {
  const deficiencyHtml = person.citiStatus.deficiencies
    .map(d => {
      const severity = getSeverityClass(d.type);
      return `
        <div class="deficiency-item ${severity}">
          <div class="deficiency-type">${d.type.replace(/_/g, ' ')}</div>
          <div class="deficiency-desc">${escapeHtml(d.description)}</div>
          <div class="deficiency-rec">${escapeHtml(d.recommendation)}</div>
        </div>
      `;
    })
    .join('');

  const trainingHtml = person.citiStatus.trainings.length > 0
    ? `<div class="mt-2" style="font-size:11px; color: var(--text-secondary);">
        ${person.citiStatus.trainings.map(t => `
          <div>${escapeHtml(t.courseName)} — ${formatDate(t.completionDate)} to ${formatDate(t.expirationDate)}
            ${t.isExpired ? '<span class="text-danger">(expired)</span>' : '<span class="text-success">(current)</span>'}
          </div>
        `).join('')}
      </div>`
    : '';

  return `
    <div class="personnel-card">
      <div class="personnel-card-header">
        <div>
          <span class="personnel-name">${escapeHtml(person.name)}</span>
          <span class="personnel-role"> — ${person.role}${person.isKsuPersonnel ? '' : ' (External)'}</span>
        </div>
        ${renderStatusBadge(person.citiStatus.overallStatus)}
      </div>
      ${person.email ? `<div class="personnel-email">${escapeHtml(person.email)}</div>` : ''}
      ${trainingHtml}
      ${deficiencyHtml}
    </div>
  `;
}

function getSeverityClass(type: string): string {
  switch (type) {
    case 'no_training_found':
    case 'training_expired':
      return '';
    case 'email_mismatch_suspected':
    case 'external_institution_no_pdf':
      return 'warning';
    case 'training_pending_sync':
      return 'info';
    default:
      return '';
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
