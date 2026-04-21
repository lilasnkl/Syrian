# DECISIONS

## 2026-03-17 - Architecture
- Adopt client-server architecture with backend modular monolith and strict 3-layer mapping.
- Rationale: maintainability, clear boundaries, no microservice overhead.
- Tradeoff: requires disciplined module boundaries to avoid monolith coupling.

## 2026-03-17 - Auth Model
- Use JWT access/refresh tokens in HttpOnly cookies with CSRF protection.
- Rationale: balances web security and session ergonomics.
- Tradeoff: requires cookie and CSRF handling across frontend/backend.

## 2026-03-17 - Chat v1
- Use REST + polling for messaging updates in v1.
- Rationale: lower complexity and faster reliable delivery.
- Tradeoff: less real-time immediacy than websockets.

## 2026-03-17 - Frontend Strategy
- Preserve existing Lovable UI and route surfaces; refactor internals incrementally.
- Rationale: retain delivered value and reduce rewrite risk.
- Tradeoff: temporary adapter layers during migration.

## 2026-03-17 - Route Architecture
- Centralize route definitions in `frontend/src/routes/route-config.tsx` and apply guard wrapping in `App.tsx`.
- Rationale: prevent guard drift and simplify role policy maintenance.
- Tradeoff: requires route config discipline for future additions.

## 2026-03-17 - Backend Domain Baseline
- Implement all requested modules as first-class Django apps with api/services/repositories/selectors/models/tests folders.
- Rationale: enforce consistent modular monolith boundaries early.
- Tradeoff: some modules are baseline-complete and still require deeper business refinements.

## 2026-03-22 - Core Migration Adapter Strategy
- Convert the existing `useDataStore` into an API-backed adapter for providers/services/orders/bids while preserving existing UI contracts and routes.
- Rationale: enables incremental migration without destructive page rewrites and keeps current user-facing screens stable.
- Tradeoff: temporary dual-state behavior remains for non-migrated domains (chat/reviews/complaints/notifications/admin).

## 2026-03-22 - Permission Hardening for Orders/Bids/Services
- Enforce method-specific auth for service mutations, add order/bid view permissions, and tighten order transition ownership rules for awarded providers.
- Rationale: close authorization gaps discovered during integration and align behavior with production-grade security expectations.
- Tradeoff: stricter rules can expose latent frontend assumptions and require adapter fallbacks.

## 2026-03-22 - Frontend Role Compatibility Policy
- Keep frontend `client` role label but map backend canonical `customer` role via dedicated mappers in auth and domain adapters.
- Rationale: preserves UI compatibility while allowing backend role model consistency.
- Tradeoff: role translation layer must be consistently applied across new modules/tests.

## 2026-03-22 - PostgreSQL Local Integration and Seed Strategy
- Standardize DB configuration via environment variables with `DATABASE_URL` support and explicit `POSTGRES_*` fallback.
- Add idempotent `seed_local_data` management command for local bootstrap using real domain models and relationships.
- Rationale: reproducible local setup with real persistence, realistic data, and safe reruns.
- Tradeoff: local PostgreSQL user must have `CREATEDB` privilege when running pytest with PostgreSQL-backed test database creation.

## 2026-03-22 - Auth Transport Compatibility for Browser Clients
- Use `django-cors-headers` with explicit local frontend origins and credentials enabled for cookie-based auth.
- Update frontend HTTP client to avoid forcing JSON `Content-Type` on GET/HEAD (prevents unnecessary preflight on protected endpoints).
- Rationale: browser preflight behavior must not block `/auth/me` session bootstrap or login flow across frontend/backend dev origins.
- Tradeoff: CORS origin allowlist must be maintained per environment to avoid over-permissive defaults.
