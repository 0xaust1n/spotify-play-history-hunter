# AGENTS

## Commit Style

- Use Angular-style Conventional Commits.
- Format: `<type>(<scope>): <subject>`.
- Keep the subject imperative and lowercase unless it contains a proper noun.
- Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`.
- Examples:
  - `feat(filters): add strict mode toggle`
  - `fix(date-picker): prevent header badge clipping`
  - `chore(format): add prettier configuration`

## Local Development

- Do not run or restart the dev service after every change.
- Only run the service when explicitly requested or when a UI/manual verification step requires it.
