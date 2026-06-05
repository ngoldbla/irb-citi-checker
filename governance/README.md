# Governance Documentation

**Extension:** IRB CITI Compliance Checker v1.0.0
**Last Reviewed:** 2026-03-04

This directory contains governance, compliance, security, and operational documentation for the IRB CITI Compliance Checker Chrome extension. It serves two audiences:

- **Governance/Compliance reviewers** evaluating data handling, privacy, and institutional policy alignment
- **SRE/Developers** maintaining, extending, and operating the extension

The extension is **institution-neutral** and **fully offline**: it makes zero network requests, contains no AI/LLM or external services, and stores data only in `chrome.storage.local`. It works at any institution through a single broad host permission (`https://*.cayuse.com/*`), auto-detecting the home institution from the Cayuse subdomain, with an optional manual override in Settings. These documents are therefore written generically — they say "consult your institution's policy" rather than naming a specific office, domain, or retention rule. For a single, end-to-end worked example of adopting the extension at one (fictional) institution, see [`../docs/DEPLOYMENT_EXAMPLE.md`](../docs/DEPLOYMENT_EXAMPLE.md).

## Documents

| # | Document | Primary Audience | Summary |
|---|----------|-----------------|---------|
| 01 | [Architecture Overview](01-architecture.md) | SRE/Dev | System design, component map, message flows, build system |
| 02 | [Data Governance](02-data-governance.md) | Governance | PII inventory, data classification, storage, retention, transmission |
| 03 | [Privacy & Compliance](03-privacy-compliance.md) | Governance | Privacy assessment, consent considerations, data sharing, institutional policy alignment |
| 04 | [Security](04-security.md) | Both | Threat model, permissions justification, credential handling, known vulnerabilities |
| 05 | [Operations & Maintenance](05-operations.md) | SRE/Dev | Build/deploy, dependency management, DOM breakage handling, monitoring |
| 06 | [Risk Register](06-risk-register.md) | Both | Catalogued risks with severity, likelihood, mitigation status, and owners |
| 07 | [Change Management](07-change-management.md) | Both | Review process, testing requirements, deployment checklist, rollback procedures |
| 08 | [Runbook](08-runbook.md) | SRE/Dev | Step-by-step procedures for common operational scenarios |

## Reading Guide

**New to this project?** Read documents 01 through 04 in order. Architecture (01) provides the foundation that all other documents reference.

**Adopting the extension at your institution?** Start with the worked example in [`../docs/DEPLOYMENT_EXAMPLE.md`](../docs/DEPLOYMENT_EXAMPLE.md), then map its steps to your own institution using documents 02 and 03.

**Responding to an incident?** Go directly to the [Runbook](08-runbook.md).

**Evaluating a code change?** See [Change Management](07-change-management.md) for review requirements by change category.

**Assessing risk?** The [Risk Register](06-risk-register.md) consolidates all identified risks with cross-references to the relevant governance documents.

## Versioning

- These documents are versioned alongside the source code in the same Git repository.
- Each document includes a `Last Reviewed` date at the top.
- Changes to governance documents follow the same review process as code changes (see [Change Management](07-change-management.md)).

## Contacts

Populate this table with the roles responsible for the extension at your institution. Use role-based addresses (e.g., a shared IRB office mailbox) rather than individual names where possible, so the documentation stays accurate as staff change.

| Role | Owner | Contact |
|------|-------|---------|
| Extension Maintainer | TBD | TBD |
| IRB / Research Compliance Office Liaison | TBD | TBD |
| IT Security Liaison | TBD | TBD |
| Data Privacy Officer | TBD | TBD |
