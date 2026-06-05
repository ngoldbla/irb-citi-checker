# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-04

First public, open-source release. The extension is now fully offline and works
at any institution that uses Cayuse, with no configuration required.

### Added
- Institution-neutral support for **any** Cayuse instance via a single
  `https://*.cayuse.com/*` host match — no per-site setup.
- Automatic home-institution detection from the Cayuse subdomain, with an
  optional manual override (institution name + home email domains) in Settings.
- Editable PI-notification template with mail-merge fields
  (`{{piName}}`, `{{protocolNumber}}`, `{{submissionTitle}}`, `{{institutionName}}`,
  `{{date}}`, `{{deficiencies}}`), saved locally and resettable to the built-in default.
- Unit test suite (Vitest) covering compliance evaluation, date logic,
  institution resolution, and notification rendering.
- Continuous integration and release automation (GitHub Actions).
- Open-source project scaffolding: MIT license, contributing guide, code of
  conduct, security policy, privacy notice, and issue/PR templates.

### Changed
- **Removed all AI/LLM functionality.** Deficiency notifications are now produced
  by a deterministic local template instead of an external language model.
  The extension makes **no network requests** and requires **no API keys**.
- Compliance wording is now institution-neutral (driven by the resolved
  institution name) rather than hardcoded to a single university.
- Renamed the internal `isKsuPersonnel` flag to `isHomeInstitution`.

### Removed
- The Portkey/LLM client and all related settings (API key, base URL, model).
- Hardcoded institution-specific Cayuse domains.

### Notes
- The Cayuse "return to PI" browser automation remains an intentional, documented
  stub. This release generates the notification text for staff to paste into
  Cayuse themselves; it does not click through Cayuse's UI.
- Dormant compliance rules (external-PDF and email-mismatch) are retained for
  future data sources, as documented in the source.
