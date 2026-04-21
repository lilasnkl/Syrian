# TASKS

## Audit Tasks
- [Done] Frontend structure and quality audit
- [Done] Preserve/refactor/replace classification
- [Done] Architecture alignment plan

## Backend Tasks
- [Done] Backend project scaffolding
- [Done] Shared response/error infrastructure baseline
- [Done] Accounts/auth implementation and runtime verification
- [Done] Providers module API + workflow hardening + tests
- [Done] Services module API + workflow hardening + tests
- [Done] Orders module API + workflow hardening + tests
- [Done] Bids module API + workflow hardening + tests
- [Done] PostgreSQL environment integration, migration execution, and local seed command
- [In Progress] Remaining domain refinement (chat/reviews/complaints/notifications/admin_panel)

## Integration Tasks
- [Done] Frontend API layer scaffolding
- [Done] Auth/session integration with backend runtime
- [Done] Providers/services/orders/bids API migration from mock store to backend adapters
- [Done] Route and role alignment with backend contract
- [In Progress] Remaining domain-by-domain migration (chat/reviews/complaints/notifications/admin)

## Refactor Tasks
- [Done] Route guard refactor (removed render-time side effect)
- [Done] Route centralization into `routes/route-config.tsx`
- [Done] Feature API contracts and mappers for providers/services/orders/bids
- [Done] Zustand data store converted to API-backed hydration for core marketplace domains
- [In Progress] Type/strictness hardening in legacy pages and i18n cleanup
- [In Progress] Full mock data dependency removal

## Testing Tasks
- [Done] Backend test scaffold and initial auth/workflow tests
- [Done] Backend API tests added for providers/services/orders/bids
- [Done] Frontend guard and role-mapping tests
- [Done] Frontend integration-sensitive store tests (auth/data-store + backend contract behavior)
- [Done] Frontend lint/build validation pass (warnings only)
- [In Progress] Full cross-domain integration matrix (chat/reviews/complaints/notifications)

## Documentation Tasks
- [Done] Core docs set initialization
- [Done] Frontend audit and target structure docs
- [In Progress] Docs update per implementation milestone
- [In Progress] Tracking files ongoing maintenance
