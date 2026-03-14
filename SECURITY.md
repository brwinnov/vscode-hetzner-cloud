# Security Policy

## Supported Versions

This project tracks security updates on the latest published extension version and the current `master` branch.

## Reporting a Vulnerability

Please open a private security report via GitHub Security Advisories if available, or open an issue with the `security` label for non-sensitive findings.

## Dependency Audit Policy

- CI fails on `high` and `critical` vulnerabilities.
- `moderate` and lower are reviewed case-by-case.
- Exceptions are documented below when there is no upstream fix.

## Current Exceptions

| Advisory | Severity | Dependency Path | Why accepted temporarily | Exit criteria |
|---|---|---|---|---|
| GHSA-gmq8-994r-jv83 (`yauzl` off-by-one) | Moderate | `@vscode/vsce -> yauzl` | Affects packaging tooling only (dev/CI), not extension runtime; `fixAvailable: false` from `npm audit` as of 2026-03-14 | Remove exception when `@vscode/vsce` upgrades to `yauzl >= 3.2.1` |

## Review Cadence

- Re-check `npm audit` on dependency updates and before release packaging.
- Revisit all exceptions at least once per month.