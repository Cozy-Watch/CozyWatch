# Cozy Watch for Chrome

Standalone Manifest V3 extension for Chrome 123+ on Windows, macOS, and Linux. No Cozy Watch backend, desktop installation, native helper, content scripts, remote code, or React runtime. The package reuses the existing compact armchair artwork rather than the multi-megabyte desktop icon.

## Build and try

1. Install the repository dependencies with `npm ci`.
2. Run `npm run build:extension`.
3. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `out/chrome-extension`.
4. Pin Cozy Watch to the toolbar. Choose GitHub OAuth, GitHub App, or personal access token.

The OAuth and GitHub App client IDs are the desktop's public identifiers. Device flow must remain enabled in both GitHub application registrations. A GitHub App user must have an installation covering the intended repositories; organization approval and permissions still apply. No client secret or installation private key is bundled. Confirm both registrations permit this distribution before publishing.

Device authorization survives closing the popup: reopen to see/copy the code and continue. The open popup polls at GitHub's permitted interval; a temporary background alarm checks pending authorization every 30 seconds while closed, respecting GitHub's minimum interval. The toolbar shows CODE while authorization is pending; reopening reveals the same code and Copy button. GitHub opens only when the user chooses Continue, after they can see/copy the code. No code or credential appears in the badge or tooltip. The pending badge and temporary alarms clear on success/cancel, and expiry/denial shows an attention indicator with a safe retry message. Expired/denied codes require a fresh attempt. Account switching requires disconnect first, avoiding accidental replacement of a working account.

## Development auto-reload

Run `npm run dev:extension` and load **out/chrome-extension-dev** as the unpacked extension (not the production folder). Keep the watcher running. Popup HTML/CSS/JavaScript changes rebuild and refresh the open popup automatically; popup form state may reset. Background worker or shared worker dependencies reload the extension, so Chrome closes the popup; click the toolbar icon again. A closed popup loads the newest UI on its next opening and checks whether its background needs a reload. This is automatic rebuilding/reloading, not state-preserving hot module replacement.

Manifest and icon changes require pressing **Reload** on the extension card at `chrome://extensions`. The development build uses only packaged-file polling and a narrowly scoped internal revision message: no local server, remote scripts, development host permissions, or relaxed CSP. The production build has no reload client/listener or revision marker. Reloads retain encrypted credentials, license, and trial dates because the extension ID/storage stay the same. Do not remove/reinstall the extension to refresh it.

## Product behavior

- Compact lists of your open PRs, PRs requesting your review, and recent comments with direct mentions or identifiable inline replies to your feedback.
- Activity is explicitly a bounded sample: 50 results per queue, five recently involved PRs, up to 30 issue/review comments each. Truncation, missing comment access, and search incompleteness are shown. This does not promise complete historical/team-wide activity. Cards include author, update time, discussion-comment count, and a bounded label list. Opening Details loads branches, change counts, review summary, and both check-run/commit-status CI signals on demand, with a five-minute detail cache. Unknown permissions or incomplete check coverage never appear as CI passing. Details use four bounded requests only when requested, not a full crawl of every PR.
- All authentication methods use the same PR/comment endpoints, not `/notifications` (unsupported by GitHub App and fine-grained PAT credentials).
- Details reuse the PR metadata response to include discussion and inline review comment counts, and flag merge conflicts when GitHub reports them. Missing or pending mergeability is explicitly unavailable; CI success never implies a conflict-free branch. Summary-only cards label discussion counts; GitHub's Conversation badge can also include review events and is not a comment-only total. Recognized Vercel bot authorization messages explain that deployment needs team authorization, while linking back to the original GitHub comment. No extra requests or raw comment-body storage are added.
- Toolbar badge counts fetched review requests; partial results are marked, outages use `!`. Native notifications are off by default, generic when enabled, and never reveal repository names or PR titles.
- Five-minute background refresh, 30-second manual-refresh cooldown, 30-second data-fetch deadline, 15-second individual request deadline, bounded response streams, two comment requests concurrently.
- Compact summaries only. Cache budget 500 KB, 24-hour TTL, no comment bodies retained. Clearing cache does not clear credentials, license, trial dates, or notification baseline.
- Initial sync is silent. Persisted account/source-watermark notification baseline (up to 200 sources) is independent of cache and survives updates; after an initial silent sync, new sources can alert for recent events. Per-source refresh-start watermarks and up to 500 seen event IDs prevent missed mid-refresh events and duplicate alerts after cache cleanup or updates. Existing older baselines migrate without replaying unknown history. A full disconnect intentionally removes account baseline and the next connection starts silently.

## License and trial

The existing lifetime Cozy Watch product **583215**, store **173903**, covers desktop and extension. The extension validates keys directly with Lemon Squeezy's public license endpoint. No administrative credentials are included.

Browser entitlement validation deliberately does **not** create a device instance or consume a two-Mac desktop activation. There is currently no separate browser-seat quota. This is not device-bound DRM. Checkout is on the Cozy Watch website; purchase recovery uses Lemon Squeezy orders; help goes to tiago@cozywatch.com.

Only live, non-expiring licenses for the configured store/product are accepted. Old annual keys must first be migrated to unlimited lifetime entitlement at Lemon Squeezy; changing the product's current price alone does not prove old licenses were migrated. Trial runs for 14 days after first successful GitHub authentication. Ended trial/revoked license pauses GitHub monitoring and alerts but preserves configuration and cached data within its TTL. A valid stored license works offline; daily validation failure preserves entitlement, while an authoritative disabled/invalid result stops monitoring.

Trial start persists across normal updates and reconnects. With no backend or native machine identity, removing all extension storage/reinstalling can restart a trial. Do not market trials as tamper-proof. There is no automatic desktop-to-extension sign-in or license transfer; users enter their existing lifetime key.

## Security boundary

Access tokens, refresh tokens, pending device codes, and license keys are encrypted with AES-256-GCM in IndexedDB. A random non-exportable CryptoKey is generated per Chrome profile/extension installation and stored in the same database. Each write uses a fresh random 96-bit nonce. Record names and schema version are authenticated. Normal extension/browser/OS updates retain the origin database and key. A stable Chrome Web Store extension ID is required; changing the ID or deleting the profile changes storage identity.

This protects against plaintext credentials in storage. It is **not** OS-keychain or hardware-backed encryption. A compromised extension can invoke decryption; profile theft, malware, or a compromised browser remain threats. Non-exportable is not a guarantee against copying/restoring a whole browser profile. Never claim unhackability, SOC 2 certification, or immunity to malicious updates.

Missing/corrupt keys do not trigger key replacement over existing ciphertext or plaintext fallback. Settings includes an explicit secure-storage recovery control. It clears the vault only when requested, preserves the trial date, and requires GitHub reconnection and license re-entry. A normal disconnect preserves the license; it cannot repair a lost key if other encrypted records remain. Cached data and trial dates are not credentials. Trusted-context storage access is defense in depth, not an isolation boundary between popup and worker. Message handlers accept only this extension's popup sender and return no credentials/device secrets/license key.

Token rotation is serialized and saved before data fetching. GitHub can invalidate the old token pair before the replacement is stored. Network loss or process termination in that gap can require reconnection; local storage cannot make remote rotation atomic. Disconnect immediately invalidates the session and aborts requests, then clears credentials through the serialized write queue; late responses cannot restore a disconnected account.

Network access is limited to GitHub APIs/device auth and Lemon Squeezy licensing, with cookies omitted, redirects rejected, strict CSP, no dynamic HTML, no browsing access, no external message API. GitHub-provided links are constrained to HTTPS github.com with no embedded credentials. Raw provider errors and private comment bodies are never shown in diagnostics. No analytics or automatic diagnostic uploads. Local diagnostics contain only timestamps and fixed event codes, capped at 200 entries (under 20 KB). Settings exports a JSON file for user review and manual sharing; no accounts, repository names, URLs, tokens, or raw exceptions enter that log.

## Release checklist

Automated tests cover vault encryption/restart/tamper/key loss; auth polling/backoff/refresh; license identity and lifetime checks; request size limits; cache/trial/account transitions; cancellation; and sender restrictions. Build enforces a 50 KB uncompressed JavaScript budget.

Before publishing, run authenticated end-to-end checks in Chrome on Windows, macOS, and Linux with real OAuth/App/PAT accounts: organization approval, permissions, browser restart, extension update with stable ID, expired/rotated tokens, license purchase/validation/revocation/outage, trial expiry, popup closure during authorization, badge and OS notification permission denial, keyboard use and zoom. Unit tests do not establish cross-OS browser certification.

Protect publisher and GitHub accounts with hardware-backed two-factor authentication, least-privilege release access, reviewed changes, pinned lockfile installs, and no remotely loaded code. Review the final extension package and store permissions before release. A Chrome Web Store listing/publication has not been performed by this implementation.

Icons reuse the desktop’s GitHub Octicons as static paths (MIT license in icons.LICENSE). Run `node scripts/sync-extension-icons.mjs` to regenerate them; no React runtime is shipped. Chrome owns the popup window; CSS translucent layers blend inside it, without a guarantee of native window transparency or backdrop blur.

Successful device-code exchanges are saved encrypted before account verification. A temporary /user outage retries verification with the saved token instead of repeating the consumed code exchange. No unverified credential is published as a connected account.
