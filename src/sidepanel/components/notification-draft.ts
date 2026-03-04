export function renderNotificationDraft(container: HTMLElement, draft: string): void {
  container.innerHTML = `
    <div class="notification-draft">${escapeHtml(draft)}</div>
    <div class="notification-actions">
      <button class="btn btn-primary" id="btn-copy-draft">Copy to Clipboard</button>
    </div>
  `;

  container.querySelector('#btn-copy-draft')?.addEventListener('click', () => {
    navigator.clipboard.writeText(draft).then(() => {
      showToast('Notification copied to clipboard');
    });
  });
}

function showToast(message: string): void {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
