<!--
Thanks for contributing to IRB CITI Checker! Please fill out the sections below.
Keep all examples and screenshots free of real participant/PII data.
-->

## Summary

Briefly describe what this PR changes and why.

## Linked issue

<!-- e.g. "Closes #123" or "Relates to #123" -->

Closes #

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that changes existing behavior)
- [ ] Documentation only
- [ ] Build / tooling / CI

## Testing done

- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] `npm run build` succeeds
- [ ] Manually tested by loading `dist/` as an unpacked extension and exercising
      the change on a Cayuse submission page (note which page/section below)

<!-- Describe the manual testing steps and what you observed. Redact any PII. -->

## Checklist

- [ ] CI is green
- [ ] Documentation updated (README / docs / CLAUDE.md) where relevant
- [ ] No new network calls — the extension stays **fully offline** (no
      AI/LLM/API/external services; data stays in `chrome.storage.local`)
- [ ] No secrets, API keys, tokens, or hardcoded institution-specific values
      added
- [ ] No real participant/PII data committed (tests, fixtures, screenshots)
