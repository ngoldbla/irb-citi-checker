# Privacy Notice — IRB CITI Checker

**Effective date: 2026-06-04**

IRB CITI Checker is a Chrome extension that helps IRB staff verify CITI Human
Subjects training compliance for the research personnel listed on a Cayuse
submission. This notice explains, in plain language, what the extension does and
does not do with data.

**The short version:** The extension only reads the personnel and CITI training
information already shown on the Cayuse submission page you are viewing. It keeps
its results and your settings in your browser's local storage and **nowhere
else**. It makes **no network requests**, sends data to **no third party**, and
has **no analytics, no telemetry, no AI/LLM, no user accounts, and no API keys**.

---

## Single purpose

IRB CITI Checker has one purpose: to read the CITI Human Subjects training records
already displayed on a Cayuse submission, evaluate each listed person against
training-compliance rules, and help staff draft a notification to the Principal
Investigator when training gaps are found. The extension does nothing unrelated to
that purpose.

## What data the extension processes

When you click **Scan**, the extension reads information that is **already visible
to you** on the Cayuse submission page you have open, including:

- Personnel names, roles, and email addresses listed on the submission
- The submission's protocol number and title
- CITI Human Subjects training records shown for each person (course names,
  completion dates, and expiration dates), including records it reads by opening
  the same training detail views you could open by hand

The extension does not access any data you could not already see yourself in
Cayuse. It does not log in for you, read other browser tabs, scan other websites,
or reach into Cayuse's servers or APIs. It only reads the page in front of you.

## Where data is stored

All data stays **on your computer, inside your browser**, using Chrome's
`chrome.storage.local`. Specifically, the extension stores:

- **Scan results** — the most recent submission scan and a local history of past
  scans, so you can review them without re-scanning
- **Your settings** — an optional institution name, optional home email domains,
  and your editable notification template

Nothing is uploaded, synced to a server, or shared with anyone. The data never
leaves your device.

## What the extension does NOT do

- **No network requests.** The extension does not contact any server. It has no
  remote backend of its own and connects to no outside service.
- **No third-party sharing.** Your data is sent to no one — not to us, not to
  Cayuse, not to the CITI Program, not to any other company.
- **No analytics or telemetry.** There is no usage tracking, no crash reporting,
  and no fingerprinting.
- **No AI or LLM.** Notifications are produced entirely on your device by a
  deterministic, editable text template that fills in fields such as
  `{{piName}}`, `{{protocolNumber}}`, `{{submissionTitle}}`, `{{institutionName}}`,
  `{{date}}`, and `{{deficiencies}}`. No language model is involved, and no
  submission data is sent anywhere to generate the text. You copy the resulting
  text and paste it into Cayuse or an email yourself.
- **No accounts or API keys.** There is nothing to sign up for and no key to
  configure.

> **Note on history:** Earlier development builds of this extension once used a
> hosted AI service to draft notifications. That capability has been **fully
> removed**. The current extension is entirely offline and uses only the local
> template described above.

## Permissions and why they are requested

The extension requests the minimum permissions needed to do its single job:

| Permission | Why it is requested |
|---|---|
| `sidePanel` | To show the extension's interface in Chrome's side panel, next to the Cayuse page. |
| `storage` | To save your scan results and settings locally, in your browser (`chrome.storage.local`). |
| `activeTab` | To work with the Cayuse tab you are actively viewing when you start a scan. |
| `scripting` | To run the page-reading logic on the Cayuse submission page so it can collect the visible personnel and training records. |
| Host access: `https://*.cayuse.com/*` | So the extension can read submission pages on Cayuse. Cayuse is a single hosted vendor and every institution's instance lives under `*.cayuse.com`, so this scope lets the extension work at any institution while still being limited to Cayuse and nowhere else. |

The extension cannot read or act on any website outside of `*.cayuse.com`.

## How to review or delete your data

Because everything is stored locally, you are always in control:

- **Clear the extension's data** by removing its stored data from
  `chrome://extensions` (open the extension's details and clear its data /
  storage), or
- **Uninstall the extension** from `chrome://extensions`. Removing the extension
  deletes the data it kept in `chrome.storage.local`.

After either action, no copy of your data remains anywhere, because no copy was
ever stored anywhere but your browser.

## Records and legal considerations

The extension is an operational aid for IRB staff, not an official system of
record. Scan results are a convenience and should not replace a reviewer's
verification of compliance in the official Cayuse records. If you run the
extension on an institution-managed device, locally stored results may fall under
your institution's applicable public-records and records-retention laws and
policies; clearing the extension's data or treating scans as transient working
notes can help you align with those policies.

## Children's privacy

This is a workplace tool for IRB and research-administration staff. It is not
directed to children and collects no data from them.

## Changes to this notice

If the extension's data practices change, this notice will be updated and the
effective date above will be revised. Because the project is open source, the full
history of changes to this notice is visible in the repository.

## Contact

Questions about this notice or the extension's privacy practices can be raised via
the project's issue tracker on GitHub:
<https://github.com/ngoldbla/irb-in-chrome>.

---

*IRB CITI Checker is open-source software released under the MIT License by Dylan
Goldblatt and contributors. It is not affiliated with, endorsed by, or sponsored
by Cayuse LLC or the CITI Program; those names are referenced only to describe
compatibility.*
