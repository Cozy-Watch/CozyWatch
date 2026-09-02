# Security Policy

## Reporting a vulnerability

Please do not report security vulnerabilities in a public GitHub issue. Email a report to [tiago@cozywatch.com](mailto:tiago@cozywatch.com) with **Cozy Watch security report** in the subject line.

Include, when possible:

- the affected version, commit, or operating system;
- a concise description of the issue and its security impact;
- reproducible steps or a proof of concept; and
- any suggested mitigation.

Please avoid including GitHub access tokens, license keys, signing credentials, personal data, or other secrets. If a secret was exposed while investigating an issue, revoke or rotate it immediately and say so in the report without sending the secret itself.

We will try to acknowledge reports within five business days and will coordinate disclosure timing with the reporter. There is no bug-bounty or guaranteed response-time program unless separately agreed in writing.

## Scope

This policy covers the source code and official Cozy Watch application releases maintained by the Cozy Watch project. Vulnerabilities in GitHub, Electron, npm packages, operating systems, or other external services should also be reported to their respective maintainers; please mention relevant upstream reports in your Cozy Watch report when useful.

## Credential and local-data notes

Cozy Watch communicates with GitHub and, for license operations, Lemon Squeezy. Packaged and development builds encrypt stored credentials and local GitHub caches with Electron's `safeStorage`; development builds use separate storage files. Persistent files live under Electron's operating-system-specific user-data directory. The application refuses to save credentials when operating-system encryption is unavailable.

Before sharing diagnostic logs or screenshots, inspect them for account identifiers, repository names, URLs, tokens, license information, or other sensitive data. Signing out and removing the app's local data are separate actions; revoke GitHub credentials through GitHub if you believe a token may have been exposed.

## Supported versions

Unless a release note says otherwise, security fixes are prioritized for the latest source and latest official release. Older versions may not receive backported fixes.
