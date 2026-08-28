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

- Node.js 22
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

Copy `.env.example` to `.env` only when you need to configure an official signed and notarized macOS build. Do not commit credentials, signing material, personal access tokens, or license keys.

## Project layout

- `src/mainProcess` contains the Electron main-process code, GitHub API integration, polling, notifications, storage, and licensing.
- `src/views` contains the React renderer and application screens.
- `forge.config.ts` contains Electron Forge packaging configuration.
- `.github/workflows` contains CI and macOS release workflows.

## Licensing

The source code in this repository is available under the MIT License; see [LICENSE](LICENSE).

The official Cozy Watch name, logos, icons, and other brand assets are not granted by the MIT License. See [BRANDING.md](BRANDING.md) before distributing a modified build.

[COMMERCIAL-BINARY-TERMS-DRAFT.md](COMMERCIAL-BINARY-TERMS-DRAFT.md) contains a discussion draft for terms that may apply to official binaries and commercial use. It is not a final agreement and does not replace the MIT License or any applicable third-party licenses.

Dependencies may have their own license terms. Review the relevant package license notices before redistributing an application bundle.

## Security

Please report suspected vulnerabilities privately. The reporting process and local credential-handling notes are in [SECURITY.md](SECURITY.md).

## Contributing

Bug reports, product feedback, documentation improvements, and code contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## Links

- Website: <https://www.cozywatch.com>
- Repository: <https://github.com/Cozy-Watch/publicCozyWatch>
- Support: <mailto:tiago@cozywatch.com>

## Status

Cozy Watch is an active public source release. APIs, packaging, licensing behavior, and product details may change as the project evolves.
