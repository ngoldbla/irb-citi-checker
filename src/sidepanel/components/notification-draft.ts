let draftTextarea: HTMLTextAreaElement | null = null;

export function renderNotificationDraft(container: HTMLElement, draft: string): void {
  container.innerHTML = `
    <div class="draft-header">
      <span class="draft-label">PI Notification</span>
      <button class="btn-link" id="btn-regenerate">Regenerate</button>
    </div>
    <textarea class="notification-draft-textarea" id="draft-textarea" rows="14">${escapeHtml(draft)}</textarea>
    <div class="notification-actions">
      <button class="btn btn-primary btn-sm" id="btn-copy-draft">Copy message</button>
    </div>
    <p class="draft-hint">Edit as needed, then paste into Cayuse's &ldquo;Missing information or materials&rdquo; field or an email to the PI.</p>
  `;

  draftTextarea = container.querySelector('#draft-textarea') as HTMLTextAreaElement;

  container.querySelector('#btn-copy-draft')?.addEventListener('click', () => {
    const text = getCurrentDraftText();
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Notification copied to clipboard');
      });
    }
  });
}

/** Show a CTA prompt to generate a notification (used on panel reload, not fresh scan) */
export function renderNotificationPrompt(container: HTMLElement, onGenerate: () => void): void {
  container.innerHTML = `
    <div class="notification-prompt">
      <p class="notification-prompt-text">Deficiencies found. Draft a notification for the PI?</p>
      <button class="btn btn-primary btn-sm" id="btn-generate-cta">Generate Notification</button>
    </div>
  `;
  container.querySelector('#btn-generate-cta')?.addEventListener('click', onGenerate);
}

/** Show a generating status message in the draft area */
export function renderDraftGenerating(container: HTMLElement): void {
  container.innerHTML = `
    <div class="draft-generating">
      <div class="draft-generating-spinner"></div>
      <span>Generating notification draft...</span>
    </div>
  `;
  draftTextarea = null;
}

/** Get the current text from the draft textarea (preserving user edits) */
export function getCurrentDraftText(): string {
  return draftTextarea?.value ?? '';
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
