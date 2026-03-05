import type { ScanProgressMessage } from '../../types/messages';

const PHASE_LABELS: Record<ScanProgressMessage['phase'], string> = {
  scanning_personnel: 'Collecting personnel data',
  opening_modal: 'Opening training modal',
  scraping_training: 'Reading training records',
  closing_modal: 'Closing modal',
};

export function renderScanProgress(container: HTMLElement, msg: ScanProgressMessage): void {
  const pct = Math.round((msg.current / msg.total) * 100);
  const phaseLabel = PHASE_LABELS[msg.phase] ?? msg.phase;

  container.innerHTML = `
    <div class="scan-progress-header">Scanning person ${msg.current} of ${msg.total}</div>
    <div class="scan-progress-name">${escapeHtml(msg.personnelName)}</div>
    <div class="scan-progress-bar-track">
      <div class="scan-progress-bar-fill" style="width: ${pct}%"></div>
    </div>
    <div class="scan-progress-detail">${phaseLabel}...</div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
