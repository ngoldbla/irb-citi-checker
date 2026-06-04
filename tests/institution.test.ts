import { describe, it, expect } from 'vitest';
import { resolveInstitution, isHomeInstitution, isHomeEmail } from '../src/lib/institution';

describe('resolveInstitution', () => {
  it('auto-detects a token from a Cayuse subdomain', () => {
    const inst = resolveInstitution('example-irb.cayuse.com');
    expect(inst.token).toBe('example');
    expect(inst.name).toBe('Example');
    expect(inst.emailDomains).toEqual([]);
  });

  it('strips qualifier labels like app/irb', () => {
    expect(resolveInstitution('example.app.cayuse.com').token).toBe('example');
    expect(resolveInstitution('example-irb.app.cayuse.com').token).toBe('example');
  });

  it('prefers an explicit override and normalizes domains', () => {
    // Hostname token is "example", but the override names a different institution,
    // so the override must win.
    const inst = resolveInstitution('example-irb.cayuse.com', {
      name: 'Acme University',
      emailDomains: ['Acme.edu', ' students.acme.edu '],
    });
    expect(inst.name).toBe('Acme University');
    expect(inst.emailDomains).toEqual(['acme.edu', 'students.acme.edu']);
    expect(inst.token).toBe('acme');
  });

  it('falls back gracefully when the hostname is missing', () => {
    const inst = resolveInstitution(undefined);
    expect(inst.token).toBe('');
    expect(inst.name).toBe('your institution');
  });
});

describe('isHomeInstitution (token mode)', () => {
  const inst = resolveInstitution('example-irb.cayuse.com');

  it('matches on the institution free-text field', () => {
    expect(isHomeInstitution({ institution: 'Example State University' }, inst)).toBe(true);
  });

  it('matches on the email domain', () => {
    expect(isHomeInstitution({ email: 'jdoe@example.edu' }, inst)).toBe(true);
  });

  it('rejects clearly external personnel', () => {
    expect(
      isHomeInstitution({ institution: 'Northwestern University', email: 'x@northwestern.edu' }, inst)
    ).toBe(false);
  });
});

describe('isHomeInstitution (explicit-domain mode)', () => {
  const inst = resolveInstitution(undefined, { name: 'Acme U', emailDomains: ['acme.edu'] });

  it('uses exact domain matching', () => {
    expect(isHomeInstitution({ email: 'a@acme.edu' }, inst)).toBe(true);
    expect(isHomeInstitution({ email: 'a@sub.acme.edu' }, inst)).toBe(false);
  });

  it('still matches the institution text via token', () => {
    expect(isHomeInstitution({ institution: 'Acme U, Biology', email: 'a@other.org' }, inst)).toBe(true);
  });
});

describe('isHomeEmail', () => {
  it('token mode matches substring of the domain', () => {
    const inst = resolveInstitution('example-irb.cayuse.com');
    expect(isHomeEmail('a@example.edu', inst)).toBe(true);
    expect(isHomeEmail('a@gmail.com', inst)).toBe(false);
    expect(isHomeEmail(undefined, inst)).toBe(false);
  });

  it('explicit-domain mode requires an exact match', () => {
    const inst = resolveInstitution(undefined, { emailDomains: ['example.edu'] });
    expect(isHomeEmail('a@example.edu', inst)).toBe(true);
    expect(isHomeEmail('a@example.com', inst)).toBe(false);
  });
});
