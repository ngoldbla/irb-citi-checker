/**
 * Institution resolution — makes the extension institution-neutral.
 *
 * The compliance rules need to know whether a person belongs to the "home"
 * institution (the one running this Cayuse instance) or is an external
 * collaborator, because the required remediation differs. Rather than hardcode
 * a single university, we resolve the home institution from two sources:
 *
 *   1. An explicit user override (institution name + home email domains) set in
 *      Settings — authoritative when present.
 *   2. Auto-detection from the Cayuse subdomain (e.g. "example-irb.cayuse.com"
 *      yields the token "example"), used when no override is configured.
 *
 * Classification is heuristic by design: a person is "home institution" when
 * their email domain or free-text institution matches the resolved identity.
 * The override exists precisely for cases where the heuristic is too loose or
 * too strict.
 */

export interface ResolvedInstitution {
  /** Display name, e.g. "Example" (auto) or "Example University" (override). */
  name: string;
  /** Home email domains for exact matching, e.g. ["example.edu"]. May be empty. */
  emailDomains: string[];
  /** Lowercase token for substring matching, e.g. "example". May be empty. */
  token: string;
}

export interface InstitutionOverride {
  name?: string;
  emailDomains?: string[];
}

/** Subdomain qualifiers that are not part of the institution's identity. */
const HOST_QUALIFIERS = new Set([
  'irb', 'research', 'app', 'cayuse', 'com', 'ethics', 'he', 'rs', 'www', 'human', 'subjects',
]);

/** Resolve the home institution from an optional override and the page hostname. */
export function resolveInstitution(
  hostname: string | undefined,
  override?: InstitutionOverride,
): ResolvedInstitution {
  const overrideDomains = normalizeDomains(override?.emailDomains ?? []);
  const overrideName = (override?.name ?? '').trim();

  if (overrideDomains.length > 0 || overrideName) {
    const token =
      tokenFromName(overrideName) ||
      (overrideDomains[0] ? tokenFromDomain(overrideDomains[0]) : '') ||
      tokenFromHost(hostname);
    return {
      name: overrideName || titleCase(token) || 'your institution',
      emailDomains: overrideDomains,
      token,
    };
  }

  const token = tokenFromHost(hostname);
  return {
    name: token ? titleCase(token) : 'your institution',
    emailDomains: [],
    token,
  };
}

/** Decide whether a scraped person belongs to the home institution. */
export function isHomeInstitution(
  person: { email?: string; institution?: string },
  inst: ResolvedInstitution,
): boolean {
  const institutionText = (person.institution ?? '').toLowerCase();
  const domain = emailDomain(person.email);

  // When explicit home domains are configured, prefer exact domain matching.
  if (inst.emailDomains.length > 0) {
    if (domain && inst.emailDomains.includes(domain)) return true;
    if (inst.token && institutionText.includes(inst.token)) return true;
    return false;
  }

  // Otherwise fall back to token (subdomain-derived) substring matching.
  if (!inst.token) return false;
  if (institutionText.includes(inst.token)) return true;
  if (domain && domain.includes(inst.token)) return true;
  return false;
}

/** True when the email's domain is one of the institution's home domains. */
export function isHomeEmail(email: string | undefined, inst: ResolvedInstitution): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  if (inst.emailDomains.length > 0) return inst.emailDomains.includes(domain);
  return inst.token ? domain.includes(inst.token) : false;
}

// ── Helpers ──────────────────────────────────────────────────

function emailDomain(email: string | undefined): string {
  return email?.split('@')[1]?.toLowerCase().trim() ?? '';
}

function normalizeDomains(domains: string[]): string[] {
  return domains
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
}

/** Derive a token from a Cayuse hostname, e.g. "example-irb.cayuse.com" -> "example". */
function tokenFromHost(hostname: string | undefined): string {
  if (!hostname) return '';
  const firstLabel = hostname.toLowerCase().split('.')[0] ?? '';
  const parts = firstLabel.split('-').filter((p) => p && !HOST_QUALIFIERS.has(p));
  return parts[0] ?? '';
}

/** Derive a token from an email domain, e.g. "example.edu" -> "example". */
function tokenFromDomain(domain: string): string {
  const labels = domain.toLowerCase().split('.').filter((l) => l && !HOST_QUALIFIERS.has(l));
  // Use the most specific non-TLD label (e.g. "example" from "example.edu").
  return labels.length > 1 ? labels[labels.length - 2] : labels[0] ?? '';
}

/** Derive a token from a display name, e.g. "Example University" -> "example". */
function tokenFromName(name: string): string {
  const first = name.trim().toLowerCase().split(/\s+/)[0] ?? '';
  return HOST_QUALIFIERS.has(first) ? '' : first;
}

function titleCase(token: string): string {
  return token ? token.charAt(0).toUpperCase() + token.slice(1) : '';
}
