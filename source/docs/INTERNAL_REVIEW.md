# Website review and CI policy

Every push and pull request runs `.forgejo/workflows/quality-gates.yml`. Required jobs are `quality` and `source-security`.

The quality job runs frontend dependency audit, TypeScript typechecking, the production build, website API dependency audit, and API JavaScript syntax checks. There is no automated test script in this repository yet; add unit and API integration tests before treating this workflow as full behavioral coverage.

The Semgrep job runs the explicit security-audit and secret rulesets with telemetry disabled. It fetches only the requested Forgejo commit, and the short-lived token is not persisted or exposed to the scanner. The build and scan jobs do not receive production environment variables.

The current runner is globally registered. Keep repository write access restricted to trusted maintainers, require both CI jobs and a separate maintainer review before merge, and do not add deployment credentials to this workflow. A repository-scoped runner with audited Docker network and volume boundaries is still the target.