export type CayusePageType =
  | 'submissionForm'
  | 'submissionDetail'
  | 'studyDetail'
  | 'dashboard'
  | 'unknown';

/**
 * Detect which Cayuse page the user is currently on.
 *
 * Cayuse IRB uses hash-based SPA routing:
 *   - Dashboard:          #dashboard
 *   - Study details:      #study/{studyId}
 *   - Submission details:  #study/{studyId}/{submissionId}
 *   - Submission form:     #submission/edit/{submissionId}/section/{sectionNum}
 *   - Submission list:     #submission/list
 *   - Study list:          #study/list/active
 */
export function detectCayusePage(url: string): CayusePageType {
  if (!isCayuseUrl(url)) {
    return 'unknown';
  }

  const hash = extractHash(url);

  // Submission form editor (where personnel + training data lives)
  if (hash.match(/^#submission\/edit\/\d+/)) {
    return 'submissionForm';
  }

  // Submission detail page (study/{studyId}/{submissionId})
  if (hash.match(/^#study\/\d+\/\d+/)) {
    return 'submissionDetail';
  }

  // Study detail page (study/{studyId} but NOT study/list/*)
  if (hash.match(/^#study\/\d+$/) || hash.match(/^#study\/\d+\/?$/)) {
    return 'studyDetail';
  }

  // Dashboard
  if (hash === '#dashboard' || hash === '') {
    return 'dashboard';
  }

  return 'unknown';
}

/** Check if a URL belongs to the KSU Cayuse IRB instance */
export function isCayuseUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes('kennesaw-irb.cayuse.com') || lower.includes('kennesaw.app.cayuse.com') || lower.includes('kennesaw-irb.app.cayuse.com');
}

/** Extract the section number from a submission form URL */
export function getFormSectionNumber(url: string): number | null {
  const match = url.match(/#submission\/edit\/\d+\/section\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/** Extract the submission ID from a form URL */
export function getSubmissionId(url: string): string | null {
  const match = url.match(/#submission\/edit\/(\d+)/);
  return match ? match[1] : null;
}

/** Check if the current form section is a personnel section (1.2 or 1.3) */
export function isPersonnelSection(url: string): boolean {
  const section = getFormSectionNumber(url);
  // Section 2 = 1.2 KSU Study Personnel, Section 3 = 1.3 Non-KSU Study Personnel
  return section === 2 || section === 3;
}

function extractHash(url: string): string {
  const hashIndex = url.indexOf('#');
  return hashIndex >= 0 ? url.substring(hashIndex) : '';
}
