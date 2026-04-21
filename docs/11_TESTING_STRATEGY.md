# 11 Testing Strategy

## Backend Tests
- Unit tests for service-layer business rules.
- API tests for serializers/views/permissions.
- Workflow state transition tests.
- Ownership and role restriction tests.

### Implemented Suites
- `apps/accounts/tests/test_auth_api.py`
- `apps/providers/tests/test_provider_api.py`
- `apps/services/tests/test_services_api.py`
- `apps/orders/tests/test_order_workflow.py`
- `apps/orders/tests/test_order_api.py`
- `apps/bids/tests/test_bid_workflow.py`
- `apps/bids/tests/test_bid_api.py`

### Current Backend Validation Command
- `pytest` (current result: 18 passing tests)
- For PostgreSQL-backed test runs, the configured DB user must have `CREATEDB` permission so Django can create `test_*` databases.

## Frontend Tests
- Route guard behavior tests.
- Role mapping tests.
- Auth/session store integration tests against backend envelope contracts.
- Marketplace data-store integration tests for providers/services/orders/bids contract mapping and mutation behavior.

### Implemented Suites
- `src/components/RouteGuards.test.tsx`
- `src/features/auth/role.test.ts`
- `src/stores/auth-store.integration.test.ts`
- `src/stores/data-store.integration.test.ts`

### Current Frontend Validation Commands
- `npm run test` (current result: 12 passing tests)
- `npm run lint` (warnings only)
- `npm run build` (successful)

## Integration Focus
- Customer request to provider bid lifecycle.
- Bid acceptance to order progression.
- Complaint to moderation action path.
- Cross-module notification consistency.

## Next Test Expansion
- Add chat polling delta tests once chat API migration is complete.
- Add reviews/complaints integration-sensitive tests after those domains are migrated from mock adapters.
- Add full workflow regression: request -> bid -> award -> in_progress -> complete -> review -> notification.
