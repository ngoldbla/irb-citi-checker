import type { CitiStatus } from '../../types/models';

const STATUS_LABELS: Record<CitiStatus['overallStatus'], string> = {
  compliant: 'Compliant',
  expired: 'Expired',
  missing: 'Missing',
  external: 'External - No PDF',
  email_mismatch: 'Email Mismatch',
  pending_sync: 'Pending Sync',
};

export function renderStatusBadge(status: CitiStatus['overallStatus']): string {
  return `<span class="status-badge ${status}">${STATUS_LABELS[status]}</span>`;
}
