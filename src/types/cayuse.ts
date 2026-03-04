/** Raw scraped data from a Cayuse submission page */
export interface ScrapedPersonnel {
  name: string;
  role: string;
  email?: string;
  institution?: string;
}

/** Raw scraped CITI training data from Cayuse */
export interface ScrapedTraining {
  personnelName: string;
  courseName: string;
  completionDate: string;
  expirationDate?: string;
  registeredEmail?: string;
  hasPdfAttachment: boolean;
}

/** Complete scraped data from a Cayuse submission */
export interface ScrapedSubmissionData {
  submissionTitle: string;
  protocolNumber?: string;
  personnel: ScrapedPersonnel[];
  trainings: ScrapedTraining[];
  pageUrl: string;
}
