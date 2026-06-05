# IRB CITI Checker

> A Chrome extension that helps IRB staff verify CITI Human Subjects training compliance for research personnel on Cayuse submissions — **fully offline, no AI, no data leaves your browser.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/ngoldbla/irb-in-chrome/actions/workflows/ci.yml/badge.svg)](https://github.com/ngoldbla/irb-in-chrome/actions/workflows/ci.yml)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/develop/migrate)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/mgmnpadkgobopfjnfphainieplbgndlm?label=Chrome%20Web%20Store&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/irb-citi-checker/mgmnpadkgobopfjnfphainieplbgndlm)
[![Users](https://img.shields.io/chrome-web-store/users/mgmnpadkgobopfjnfphainieplbgndlm?label=users)](https://chromewebstore.google.com/detail/irb-citi-checker/mgmnpadkgobopfjnfphainieplbgndlm)

> ✅ **Now available — free — on the [Chrome Web Store](https://chromewebstore.google.com/detail/irb-citi-checker/mgmnpadkgobopfjnfphainieplbgndlm).**
> One-click install, automatic updates. No account or developer tools needed.

IRB CITI Checker reads the personnel and CITI training records already shown on a
Cayuse submission, evaluates each person against a set of Human Subjects training
compliance rules, and — when there are gaps — drafts a ready-to-send notification
for the Principal Investigator. Everything runs locally in your browser.

---

## Why use it

Manually cross-checking every investigator's CITI training status on a Cayuse
submission is slow and error-prone. This extension does it in one click and
explains exactly what's missing for each person, so you can return a submission
with clear, specific guidance.

- 🔒 **Private by design.** No network requests, no API keys, no telemetry. The
  extension only reads the page you're already looking at and stores its results
  locally in your browser.
- 🏛️ **Works at any institution.** Cayuse is a single vendor, so the extension
  supports every `*.cayuse.com` instance out of the box — no configuration needed.
- ⚡ **Instant, deterministic notifications.** Deficiency messages are produced
  from an editable template, not a language model, so the output is consistent
  and reviewable.
- 🧩 **Open source (MIT).** Fork it, audit it, adapt it to your office's workflow.

## Features

- One-click compliance **scan** of all listed study personnel on a Cayuse
  submission form.
- Per-person evaluation with plain-language **deficiency descriptions and
  recommended actions** (missing training, expired training, pending sync, and
  more).
- Automatic **home-institution vs. external** classification (auto-detected from
  the Cayuse web address, with a manual override in Settings).
- An editable, **mail-merge notification template** for the PI that pulls in the
  specific issues found. Copy it and paste it into Cayuse's "Missing information
  or materials" field or an email.
- A side panel that lives alongside Cayuse — no copying data between tabs.

## Install

### Option A — Chrome Web Store (recommended)

[**➜ Install from the Chrome Web Store**](https://chromewebstore.google.com/detail/irb-citi-checker/mgmnpadkgobopfjnfphainieplbgndlm)

1. Open the listing and click **Add to Chrome**.
2. Pin the IRB CITI Checker icon to your toolbar.

It's free, updates automatically, and works at any institution on `*.cayuse.com`.

### Option B — From a release build (no developer tools needed)

1. Download the latest `irb-citi-checker-vX.Y.Z.zip` from the
   [Releases page](https://github.com/ngoldbla/irb-in-chrome/releases).
2. Unzip it to a folder you'll keep.
3. Open `chrome://extensions` in Chrome.
4. Turn on **Developer mode** (top-right toggle).
5. Click **Load unpacked** and select the unzipped folder.

### Option C — Build from source

```bash
git clone https://github.com/ngoldbla/irb-in-chrome.git
cd irb-in-chrome
npm install
npm run build
```

Then load the generated `dist/` folder as an unpacked extension (steps 3–5 above).

## Usage

1. Open a submission in your Cayuse Human Ethics (IRB) instance.
2. Click the IRB CITI Checker toolbar icon to open the side panel.
3. Click **Scan Personnel**. The extension reads each person's CITI training
   records (opening the training modals as needed) and evaluates compliance.
4. Review the per-person results. If there are deficiencies, a **PI notification**
   is drafted using your template — edit it, copy it, and send it however your
   office prefers.

### Configuration (optional)

Open **Settings** (gear icon) to:

- Set your **institution name** and **home email domains** — only needed if the
  automatic detection from your Cayuse subdomain misclassifies internal vs.
  external personnel.
- Customize the **PI notification template** using the available merge fields:
  `{{piName}}`, `{{protocolNumber}}`, `{{submissionTitle}}`, `{{institutionName}}`,
  `{{date}}`, and `{{deficiencies}}`.

## How it works

```
┌─────────────┐    messages     ┌──────────────┐    messages    ┌─────────────┐
│  Side Panel  │ ◄────────────► │Service Worker │ ◄───────────► │Content Script│
│  UI + state  │                │ router + eval │               │ Cayuse DOM   │
└─────────────┘                └──────────────┘               └─────────────┘
```

- The **content script** scrapes personnel and CITI training data from the Cayuse
  DOM.
- The **service worker** evaluates compliance, resolves the home institution, and
  renders the notification from your template.
- The **side panel** displays results and the editable draft.

No step contacts any external service. See [docs/](docs/) and
[`governance/`](governance/) for architecture, data-handling, and security details.

## Privacy

The extension processes only the data already visible on your Cayuse submission
page, keeps it in your browser's local storage, and sends it nowhere. See
[PRIVACY.md](PRIVACY.md) for the full notice.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our
[Code of Conduct](CODE_OF_CONDUCT.md). To report a vulnerability, see
[SECURITY.md](SECURITY.md).

```bash
npm run typecheck   # type-check
npm test            # run unit tests
npm run build       # build to dist/
```

## License

[MIT](LICENSE) © Dylan Goldblatt and contributors.

---

*Not affiliated with, endorsed by, or sponsored by Cayuse LLC or the CITI Program.
"Cayuse" and "CITI Program" are trademarks of their respective owners; they are
referenced here only to describe compatibility.*
