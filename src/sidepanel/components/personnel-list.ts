import type { PersonnelRecord } from '../../types/models';
import { renderPersonnelCard } from './personnel-card';

export function renderPersonnelList(container: HTMLElement, personnel: PersonnelRecord[]): void {
  const compliant = personnel.filter(p => p.citiStatus.overallStatus === 'compliant');
  const deficient = personnel.filter(p => p.citiStatus.overallStatus !== 'compliant');

  let html = '';

  if (deficient.length > 0) {
    html += `
      <div class="personnel-section">
        <h3>Requires Action (${deficient.length})</h3>
        ${deficient.map(p => renderPersonnelCard(p)).join('')}
      </div>
    `;
  }

  if (compliant.length > 0) {
    html += `
      <div class="personnel-section">
        <h3>Compliant (${compliant.length})</h3>
        ${compliant.map(p => renderPersonnelCard(p)).join('')}
      </div>
    `;
  }

  container.innerHTML = html;
}
