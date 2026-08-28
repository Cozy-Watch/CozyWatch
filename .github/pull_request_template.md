## Summary

Describe the problem and the user-facing effect of this change.

## Verification

- [ ] `npm ci`
- [ ] `npm audit --omit=dev --audit-level=moderate`
- [ ] `npm run lint`
- [ ] `npm run types`
- [ ] `npm test -- --runInBand`
- [ ] `npm run package` (when packaging or runtime behavior is affected)

## Safety and release checklist

- [ ] Tests and examples contain only synthetic data; no authenticated API responses or private repository metadata were committed.
- [ ] No credentials, tokens, license keys, signing material, local storage, or sensitive URLs were added to code, fixtures, logs, screenshots, or generated files.
- [ ] New dependencies and GitHub Actions are justified; Actions are pinned to a full commit SHA.
- [ ] New privileged IPC, navigation, storage, or Electron configuration changes preserve the documented security model.
- [ ] Documentation and tests were updated for behavior, configuration, licensing, or asset changes.
- [ ] I have the right to submit any included code or assets under their stated terms.
