# Sejahtera Bersama IMS - Missing Items, Optimization, and Fix Plan

## Executive Assessment

The backend foundation is comparatively strong and feature-rich, while project-wide quality controls and frontend delivery are still incomplete. The highest leverage work is to establish guardrails (tests + CI + secure defaults) before scaling new features.

## Missing Items

## 1) Testing and Quality Gates

- Backend test modules exist but are largely placeholders and do not protect critical workflows.
- Frontend has no unit/integration/e2e test setup.
- No repository CI workflows are present to enforce lint/type/test/build checks.

Why this matters:
- regressions can enter core business flows unnoticed,
- deployment confidence stays low,
- refactoring speed is limited by manual verification.

## 2) Frontend Product Implementation

- Current frontend is a starter template, not the IMS application.
- Missing:
  - routing and app shell,
  - authenticated session handling,
  - API client/data-fetching layer,
  - domain feature pages and reusable components,
  - global error/loading/empty-state UX.

Why this matters:
- backend capabilities are not yet exposed as usable product workflows.

## 3) Documentation and Onboarding Gaps

- No root-level project docs for architecture, setup, and contribution flow.
- Environment template expected by docs/scripts (for example `env.example`) is missing.

Why this matters:
- onboarding is slower and error-prone,
- environment drift risk increases,
- handover/maintenance becomes harder.

## 4) Security and Operational Baseline Gaps

- Risky settings behavior if production env is misconfigured (for example fallback secret behavior).
- Token/session hardening can be improved (refresh rotation/revocation policy review).
- No visible automated dependency/security/secret scanning in CI.

Why this matters:
- increases security risk and incident surface,
- weakens production resilience.

## 5) Observability and Reliability Gaps

- No centralized error tracking/metrics/tracing baseline.
- Celery infrastructure is configured, but concrete task usage appears limited.
- Some deployment automation patterns are fragile (configuration mutation risk in scripts).

Why this matters:
- harder incident diagnosis,
- unnecessary operational complexity,
- higher chance of environment-specific deployment issues.

## Optimization Opportunities

## Architecture and Maintainability

- Introduce a clear frontend architecture (feature-based modules, shared UI/system layer, typed API contracts).
- Remove stale or legacy backend code paths that no longer reflect current models.
- Standardize API response and error envelope patterns across modules.

## Performance

- Add frontend route-level code splitting and bundle analysis.
- Add backend query profiling and index tuning based on real access patterns.
- Consider async processing only for workloads that truly benefit (PDF/report generation, scheduled rollups).

## Developer Experience

- Add root-level docs (`README`, contribution and runbook notes).
- Standardize local commands with one documented flow for full stack startup, test, and lint.
- Introduce pre-commit hooks for quick local quality feedback.

## Security and Compliance

- Enforce safe production settings with fail-fast behavior.
- Validate file uploads robustly (size/type/extension checks and sanitization rules).
- Add automated scanning: dependency vulnerability checks and secret scanning.

## Priority Fix Plan

## P0 (Immediate: Week 1-2)

1. Add CI pipeline for backend/frontend lint, type checks, and build.
2. Add foundational automated tests for critical backend flows:
   - authentication and permissions,
   - stock mutation invariants,
   - order/payment state transitions.
3. Add root docs and missing environment template file(s).
4. Harden production security defaults (secret/config behavior).

## P1 (Near-Term: Week 3-5)

1. Implement frontend app foundation:
   - routing, auth/session, API client, data fetching/caching layer.
2. Build initial domain screens linked to existing backend endpoints.
3. Add frontend test baseline (unit/component + smoke e2e).
4. Improve deployment script safety and idempotency.

## P2 (Mid-Term: Week 6-10)

1. Add observability stack:
   - structured logs,
   - request correlation IDs,
   - error monitoring,
   - basic service dashboards/alerts.
2. Optimize backend report/query performance using measured bottlenecks.
3. Review Celery usage and simplify or expand based on real workload.
4. Raise coverage targets and enforce thresholds in CI.

## Success Criteria

This plan is successful when:
- every pull request is blocked on automated quality checks,
- critical business workflows are covered by tests,
- frontend exposes key IMS workflows end-to-end,
- production configuration is secure by default and observable in real time.
