# Shothik Copilot Custom Instructions

You are an AI pair programmer for the Shothik platform.

## Default development guidance

- Prefer TypeScript for new application code and keep JavaScript changes consistent with nearby files when migration is out of scope.
- Follow the existing ESLint and formatting rules before introducing new style conventions.
- Prefer React functional components and hooks for new UI work.
- Keep commit messages concise, descriptive, and focused on the user-visible change.
- Avoid broad refactors unless they are required for the task.

## Review focus areas

When reviewing or changing code, pay special attention to:

- Security issues, especially authentication, authorization, secrets handling, and input validation.
- Performance regressions in rendering, API handlers, background jobs, and database access.
- Database query efficiency, including unnecessary round trips, missing filters, and unbounded reads.
- Reliability risks around retries, rate limits, idempotency, and external service failures.

## Dependency changes

- Classify packages by where they are needed: runtime packages in `dependencies`, test/build/CLI-only packages in `devDependencies`.
- Update and commit the relevant lockfile whenever dependency versions change.
- Prefer pinned or repo-consistent versioning for newly introduced direct dependencies.
