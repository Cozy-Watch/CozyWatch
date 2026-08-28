# Contributing to Cozy Watch

Thanks for helping improve Cozy Watch. Contributions can include code, tests, documentation, design feedback, bug reports, and small improvements to the developer experience.

## Before you start

For a significant change, open an issue or discussion first so we can agree on the problem and approach. For a small, well-scoped fix, a pull request is fine. Security vulnerabilities must be reported privately as described in [SECURITY.md](SECURITY.md).

## Local setup

1. Install Node.js 22 and npm.
2. Fork and clone the repository.
3. Install dependencies with `npm ci`.
4. Start the app with `npm start`.

Do not commit `.env` files, credentials, signing certificates, access tokens, license keys, generated packages, or local storage.

## Making changes

- Keep changes focused and explain the user-facing reason for them.
- Follow the existing TypeScript, React, and Electron patterns.
- Add or update tests when behavior changes.
- Do not weaken Electron security settings or expose new privileged IPC operations without documenting the security model.
- Avoid logging tokens, license keys, or other sensitive values.
- Update documentation when commands, configuration, licensing, or user-visible behavior changes.

## Checks before opening a pull request

Run the checks relevant to your change, and ideally all of these:

```sh
npm run types
npm run lint
npm test -- --runInBand
npm run package
```

In the pull request description, summarize the change, describe how it was tested, and call out any known limitations or follow-up work.

## Pull requests

Pull requests should be reviewable without reconstructing the author's intent. Include screenshots or a short recording for meaningful UI changes. Maintainers may request revisions, split a pull request, or decline a change that does not fit the project's direction.

By submitting a contribution, you represent that you have the right to submit it and agree that the contribution may be distributed under the MIT License in [LICENSE](LICENSE). Contributions do not grant permission to use the Cozy Watch trademarks; see [BRANDING.md](BRANDING.md).

## Code of conduct

Be respectful, specific, and constructive. Harassment, discrimination, threats, doxxing, and deliberately disruptive behavior are not welcome. If a difficult interaction cannot be resolved in the thread, contact the maintainer at [tiago@cozywatch.com](mailto:tiago@cozywatch.com).
