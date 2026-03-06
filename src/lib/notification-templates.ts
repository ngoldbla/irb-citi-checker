import type { PersonnelRecord, Submission } from '../types/models';

/** Build the system prompt for notification drafting */
function systemPrompt(): string {
  return `You are a professional IRB (Institutional Review Board) compliance assistant at Kennesaw State University. You draft clear, professional, and helpful deficiency notification emails to Principal Investigators regarding CITI Human Subjects Research training compliance issues.

Your tone should be:
- Professional but not overly formal
- Clear and actionable
- Helpful - include specific steps the PI should take
- Not punitive - frame as assistance to help them get compliant

Content rules:
- CITI Human Subjects Research training is required for all KSU research personnel.
- Do NOT suggest reconciling records in Cayuse or mention Cayuse by name.
- Do NOT reference email address mismatches in error resolution advice.
- If a person believes they have completed training and it is not showing, ask them to provide a copy of their CITI completion certificate.
- Sign off as "Research Integrity" (not "IRB Compliance" or "IRB Office").

Always reference the specific protocol number and personnel involved.`;
}

/** Build the user prompt with submission details and deficiencies */
export function buildNotificationPrompt(
  submission: Submission,
  targetPersonnel?: string[]
): { system: string; user: string } {
  const deficientPersonnel = submission.personnel.filter(p => {
    if (p.citiStatus.overallStatus === 'compliant') return false;
    if (targetPersonnel && targetPersonnel.length > 0) {
      return targetPersonnel.includes(p.name);
    }
    return true;
  });

  const personnelDetails = deficientPersonnel.map(p => formatPersonnelDeficiency(p)).join('\n\n');

  const user = `Draft a deficiency notification email for the following IRB submission:

Protocol: ${submission.protocolNumber ?? submission.id}
Title: "${submission.title}"

The following personnel have CITI training compliance issues:

${personnelDetails}

Draft a professional email to the PI explaining these deficiencies and what action is needed for each person. Include specific steps they should take to resolve each issue. The email should be ready to send with minimal editing.`;

  return { system: systemPrompt(), user };
}

function formatPersonnelDeficiency(person: PersonnelRecord): string {
  const lines = [
    `**${person.name}** (${person.role}${person.isKsuPersonnel ? ', KSU' : ', External'})`,
    `Status: ${person.citiStatus.overallStatus.replace('_', ' ').toUpperCase()}`,
  ];

  for (const d of person.citiStatus.deficiencies) {
    lines.push(`- Issue: ${d.description}`);
    lines.push(`  Recommendation: ${d.recommendation}`);
  }

  if (person.citiStatus.trainings.length > 0) {
    lines.push(`  Training records found:`);
    for (const t of person.citiStatus.trainings) {
      lines.push(`  - ${t.courseName} (completed: ${t.completionDate}, expires: ${t.expirationDate})`);
    }
  }

  return lines.join('\n');
}
