/**
 * Centralized CSS selectors for Cayuse DOM scraping.
 *
 * Verified against a live Cayuse Human Ethics (IRB) instance.
 * Cayuse uses the Semantic UI framework with custom e3-table components, so
 * these selectors target Semantic UI / e3-table classes rather than semantic
 * HTML tags (the app renders almost no <button> elements).
 */
export const SELECTORS = {
  /** Submission form header elements */
  submission: {
    /** IRB number in the form header bar */
    protocolNumber: '.submission-header .irb-number, .form-header .irb-number',
    /** Submission title in the form header */
    title: '.submission-header .submission-title, .form-header .title',
    /** Fallback: look for the heading with IRB number */
    protocolHeading: 'h2.heading, .protocol-heading',
  },

  /** Personnel tables on the submission form (section 1.2 / 1.3) */
  personnel: {
    /** Containers that group personnel by assignment type (PI, Co-PI, etc.) */
    assignmentContainer: '[class*="assignment-type-"]',
    /** Individual personnel data row (must contain e3-table-row-cell) */
    dataCell: 'td.e3-table-row-cell',
    /** Name cell (first cell in a data row) */
    nameCell: 'td.e3-table-row-cell.first',
    /** Training "View" button cell */
    trainingCell: 'td.open-person-training-cell',
    /** Remove button cell (last, used to filter out non-data rows) */
    removeCell: 'td.remove-person-finder-cell',
  },

  /** Training modal (opened by clicking "View" on a personnel row) */
  training: {
    /** The Bootstrap modal overlay */
    modal: '.modal.fade.in',
    /** The training-specific dialog */
    dialog: '.modal-dialog.training-finder',
    /** Training data table */
    table: '.training-finder table.e3-table',
    /** Header cells */
    headerCell: 'th.e3-table-header-cell',
    /** Data cells in training rows */
    dataCell: 'td.e3-table-row-cell',
    /** Close button */
    closeButton: '.modal.fade.in .close',
  },

  /** Sidebar section navigation in the submission form */
  sectionNav: {
    /** Section label text */
    label: 'span.section-label',
    /** Section container */
    container: 'div.section-text',
  },
} as const;
