# Security Policy

## Supported versions

Glaze Lab is deployed continuously from the `main` branch. Only the current `main` (and the latest tagged release, if any) receive security fixes.

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Use GitHub's private vulnerability reporting instead: go to the repository's **Security** tab and choose **Report a vulnerability**, or open <https://github.com/oceloteye/Glaze-App/security/advisories/new> directly. Reports go only to the maintainers.

Include, where you can:

- the affected component (backend API, frontend, Docker image, CI workflow),
- steps or a request that reproduces the problem,
- the impact you believe it has.

You should receive an acknowledgement within a week. Once a fix is available we will publish a GitHub security advisory crediting the reporter unless you ask otherwise.

## Scope notes

- The public API is unauthenticated by design; rate limiting and abuse protection are the responsibility of the hosting platform.
- Glaze chemistry, colour prediction and food-safety indications are *not* security features. Inaccuracies there should be reported as normal bugs (see [CONTRIBUTING.md](CONTRIBUTING.md)) and are covered by the disclaimer in [NOTICE](NOTICE).
