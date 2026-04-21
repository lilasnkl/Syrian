# CHANGELOG

## 2026-03-17
- Initialized production architecture documentation set (`docs/01` to `docs/14`).
- Created project tracking artifacts (`tracking/*`).
- Captured frontend audit and target frontend structure strategy.
- Established architecture/auth/workflow decisions and risks.
- Affected Areas: docs, tracking, project governance.
- Reason: baseline required for disciplined phased implementation.

## 2026-03-17 (Implementation Update)
- Added `backend/` Django modular monolith scaffold with config, shared infrastructure, and all required domain app folders.
- Implemented backend foundations: custom user model, JWT cookie auth endpoints, shared API envelopes, exception handling, pagination, role permissions.
- Implemented domain baseline models/services/APIs for providers, services, orders, bids, chat, reviews, complaints, notifications, and admin_panel.
- Added backend workflow/auth tests (`accounts`, `orders`, `bids`).
- Added frontend structure scaffolding (`app`, `routes`, `api`, `features`, `store`, `utils`, `styles`).
- Centralized frontend route definitions and refactored route guard behavior.
- Added typed frontend HTTP client and auth feature API.
- Removed high-impact `any`/`as any` usages and added frontend tests for route guards and role mapping.
- Affected Areas: backend, frontend architecture, tests, tracking.
- Reason: execute phases 2-5 incrementally while preserving existing UI value.

## 2026-03-17 (Validation Update)
- Installed frontend dependencies and executed frontend quality checks.
- Frontend validation results: lint (0 errors, warnings only), tests (6 passing), production build successful.
- Generated initial Django migrations for accounts, providers, services, orders, bids, chat, reviews, complaints, notifications.
- Backend validation results: `manage.py check` passed, migrations applied successfully, pytest passed (5 tests).
- Affected Areas: backend migrations, frontend validation, quality assurance.
- Reason: verify implementation readiness and reduce regression risk.

## 2026-03-22 (Auth + Core Domain Integration Update)
- Migrated frontend auth/session from mock role login to backend cookie-JWT (`bootstrapSession`, login/register/logout/refresh/profile update paths).
- Replaced login modal demo role switching with real credential-based authentication flow.
- Added frontend auth mapper layer to keep `client` UI role compatibility with backend `customer` role.
- Implemented API contracts + mappers for providers/services/orders/bids and exported feature modules.
- Converted `useDataStore` to API-backed hydration for providers/services/orders/bids while preserving existing UI screens and route URLs.
- Added backend contract fields needed by frontend adapters (`blocked_reason`, order customer/bids context, bid provider/order context, verification provider context).
- Hardened backend permissions and transitions (service mutation auth, order/bid view permissions, awarded-provider transition restrictions).
- Added backend API tests for providers/services/orders/bids and frontend integration-sensitive tests for auth/data-store contract behavior.
- Validation results: backend `pytest` 18 passing; frontend `npm run test` 12 passing; frontend lint/build passing (lint warnings only).
- Affected Areas: frontend auth, frontend data-store, providers/services/orders/bids backend modules, test suites, tracking.
- Reason: execute requested next-phase migration order with real API integration and regression safety coverage.

## 2026-03-22 (PostgreSQL Integration + Local Seed Update)
- Completed backend PostgreSQL integration using environment-driven settings with `DATABASE_URL` parsing and `POSTGRES_*` fallback.
- Added `backend/.env.example` with local PostgreSQL + JWT/CSRF + seed overrides.
- Applied all migrations on real PostgreSQL database (`syrian_services`).
- Added idempotent management command `python manage.py seed_local_data` for admin/users/providers/services/orders/bids sample data.
- Verified rerunnable seed behavior and referential integrity across user-provider-service-order-bid relationships.
- Ran backend tests on PostgreSQL (`pytest`: 18 passed) and frontend integration-sensitive tests (`vitest`: 12 passed).
- Affected Areas: backend settings, seed/bootstrap workflow, docs, tracking.
- Reason: make local environment immediately usable with real persistent data and reproducible setup.

## 2026-03-22 (Auth Transport/CORS Fix for Seeded Login)
- Investigated seeded-login failures end-to-end and verified seeded user records/password hashes/flags were valid in PostgreSQL.
- Identified auth transport issue: frontend was forcing `Content-Type: application/json` on `GET /auth/me` (triggering preflight), while backend lacked CORS middleware/preflight handling for cross-origin frontend requests.
- Added `django-cors-headers` and configured CORS with credentials for local frontend origins.
- Updated frontend HTTP client to avoid JSON `Content-Type` on GET/HEAD and attach CSRF header on mutating requests when `csrftoken` cookie exists.
- Updated auth cookie handling to use centralized JWT cookie settings/constants.
- Added backend auth tests for cookie + `/auth/me` flow and CORS preflight behavior; added frontend HTTP client tests for header behavior.
- Validation results: backend `pytest` 19 passing; frontend `vitest` 14 passing; frontend lint/build passing.
- Affected Areas: backend auth transport, frontend API client, auth test coverage.
- Reason: fix real login/session flow from app without altering seed data or user credentials.

## 2026-03-22 (Orders Create 500 Fix)
- Fixed `POST /api/v1/orders/` internal server error when `service` ID is provided.
- Root cause: order serializer accepted raw integer for `service`, and service layer passed it directly to model create, causing FK assignment `ValueError`.
- Updated order create/update serializer to use `PrimaryKeyRelatedField` for `service`, enabling proper FK resolution and 400 validation for invalid IDs.
- Added regression tests for creating orders with valid/invalid service references.
- Validation results: backend `pytest` 21 passing; targeted reproduction now returns 201 for valid service and 400 validation for invalid/nonexistent service (no 500).
- Affected Areas: orders API serializer, orders API tests.
- Reason: enforce robust request validation and prevent server errors from client-provided foreign keys.
