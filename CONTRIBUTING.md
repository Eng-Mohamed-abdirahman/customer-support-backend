# Contributing to Technov

Thanks for helping improve Technov. This guide keeps the codebase consistent and the history easy to read.

## Workflow

1. Create a branch from `main`: `feature/<short-name>`, `fix/<short-name>` or `chore/<short-name>`.
2. Make focused commits (see below).
3. Run the checks locally before pushing:

   ```bash
   # backend
   cd backend && npm run typecheck && npm test

   # frontend
   cd frontend && npm run lint && npm run typecheck
   ```

4. Open a pull request into `main`. CI must pass before merging.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org):

```text
<type>(<scope>): <what changed, in the imperative>

<optional body: why the change was needed>
```

| Type | Use for |
| --- | --- |
| `feat` | A new feature |
| `fix` | A bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `chore` | Tooling, dependencies, config |
| `ci` | CI workflow changes |

Examples:

```text
feat(tickets): let agents reassign a ticket
fix(security): scope accept-chat to the agent's organization
test(api-keys): cover revoked and suspended keys
```

Avoid messages like `updated`, `fixed some bugs` or `wip`: say what changed.

## Code guidelines

- **Backend:** `routes → controllers → services → models`. Keep routes and controllers thin; business logic lives in services. Use ES `import`/`export`, the shared `logger` (not `console`), and `getErrorMessage` for caught errors. Every query on tenant data must filter by `organizationId`.
- **Frontend:** use shadcn/ui components, put API calls in `services/`, and keep pages small by extracting components and hooks.
- **Tests:** add a test for every bug fix and for every new route, especially anything involving auth or tenant isolation.
