# Cozy Watch

Cozy Watch is a desktop companion for GitHub. It keeps an eye on the pull requests, reviews, checks, and mentions that matter to you and brings useful updates to your desktop and menu bar.

## Features

- GitHub authentication through OAuth, a personal access token, or a GitHub App
- Pull request, review, CI, and mention notifications
- Repository selection and notification preferences
- A menu-bar experience for quick access and quiet background polling
- Light and dark appearance settings
- macOS, Windows, and Linux packaging configuration in the repository

Cozy Watch uses GitHub's APIs and is not affiliated with or endorsed by GitHub, Inc.

## Development

### Requirements

- Node.js 22.12 or newer (but earlier than Node.js 23)
- npm
- A GitHub account for exercising authenticated flows

Install dependencies and start the Electron development app:

```sh
npm ci
npm start
```

Useful checks and build commands:

```sh
npm run types       # Type-check without emitting files
npm run lint        # Run ESLint
npm test            # Run the Jest test suite
npm run package     # Create an unpacked packaged application
npm run make        # Build distributable artifacts
```

## macOS release candidates and diagnostics

Manually dispatching the **Release macOS** workflow produces a signed release-candidate artifact with performance diagnostics enabled. It records bounded, redacted startup milestones, renderer responsiveness, GitHub polling durations, and process CPU/memory metrics from launch until exit. In **Settings**, select **Export diagnostics** to save a JSON support bundle; standard production releases do not enable this collection.

Before opening a pull request, run the same checks as CI from a clean dependency tree:

```sh
npm ci
npm audit --omit=dev --audit-level=moderate
npm run lint
npm run types
npm test -- --runInBand
npm run package
```

Copy `.env.example` to `.env` only when you need to configure an official signed and notarized macOS build. Do not commit credentials, signing material, personal access tokens, or license keys.

## Project layout

- `src/mainProcess` contains the Electron main-process code, GitHub API integration, polling, notifications, storage, and licensing.
- `src/views` contains the React renderer and application screens.
- `forge.config.ts` contains Electron Forge packaging configuration.
- `.github/workflows` contains CI and macOS release workflows.

## Licensing

The source code in this repository is available under the MIT License; see [LICENSE](LICENSE). The MIT License permits personal and commercial use, including commercial use of your own builds and forks, subject to its notice requirements and applicable third-party licenses.

The official Cozy Watch name, logos, icons, and other brand assets are not granted by the MIT License. See [ASSETS.md](ASSETS.md) and [BRANDING.md](BRANDING.md) before redistributing assets or a modified build.

[COMMERCIAL-BINARY-TERMS-DRAFT.md](COMMERCIAL-BINARY-TERMS-DRAFT.md) contains a discussion draft for an optional official distribution, licensing service, and support offering. It is not a final agreement, does not restrict MIT-licensed source code, and does not replace applicable third-party licenses.

Dependencies may have their own license terms. Review the relevant package license notices before redistributing an application bundle.

## Security

Please report suspected vulnerabilities privately. The reporting process and local credential-handling notes are in [SECURITY.md](SECURITY.md).

For this public repository, enable GitHub Secret Scanning, push protection, validity checks, and Dependabot security updates in repository settings. Organization owners should also periodically run GitHub's Secret Risk Assessment and rotate or revoke every credential it identifies.

## Contributing

Bug reports, product feedback, documentation improvements, and code contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) first.

## Links

- Website: <https://www.cozywatch.com>
- Repository: <https://github.com/Cozy-Watch/CozyWatch>
- Support: <mailto:tiago@cozywatch.com>

## Status

Cozy Watch is an active public source release. APIs, packaging, licensing behavior, and product details may change as the project evolves.
