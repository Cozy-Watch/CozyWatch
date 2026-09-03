# Git workflow

- Never commit changes. Leave all changes staged or unstaged for the maintainer to review and commit manually.
- Never push branches or tags.
- Never push directly to `main`. Changes must reach `main` only through a maintainer-reviewed pull request.

# Coding preferences

- Prefer immutability: use `const`, readonly data, pure functions, and non-mutating array/object operations where practical.
- Avoid mutating shared state or function arguments; when mutation is required for performance or an external API, keep it local and explicit.
