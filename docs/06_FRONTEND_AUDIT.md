# 06 Frontend Audit

## Current Structure Summary
- Existing frontend is a Lovable-generated React + TypeScript app with extensive marketplace screens.
- Routes exist for customer, provider, and admin contexts.
- Core data and auth currently rely on local mock stores.
- React Query provider is configured, but real server-state usage is minimal.

## Strengths
- Strong visual system and reusable UI components.
- Broad feature coverage for marketplace UX.
- Role-oriented navigation and route surfaces already present.
- i18n baseline with EN/AR toggling and RTL support.

## Weaknesses
- Business logic embedded in client stores and pages.
- Mock-only auth and domain workflows.
- Route guards include render-time side effects.
- TypeScript strictness is disabled; `any` usage exists.
- Real API integration layer is missing.

## Technical Debt
- `mock-data.ts` used as primary domain source.
- Oversized page components combining UI + business logic.
- Placeholder testing setup with minimal meaningful coverage.
- Legacy scaffold style file (`App.css`) retained.
- Translation text quality/encoding inconsistencies in parts of the file.

## Reuse Opportunities
- Preserve UI components and layout shell.
- Preserve route URLs for compatibility.
- Reuse domain types as contract seeds.
- Reuse form schema patterns built with RHF + Zod.

## Refactor Priorities
1. Introduce API and feature-layer boundaries.
2. Refactor route guards and auth contract.
3. Migrate store-driven workflows to query/mutation services.
4. Improve type safety and remove `any`.
5. Add critical-flow frontend tests.

## Risky Areas
- Bid acceptance/order transitions currently in frontend store logic.
- Admin moderation actions currently client-side only.
- Chat and notifications rely on local arrays and cannot scale.

## Immediate Recommendations
- Keep UI and route structure, replace data/control flows first.
- Add backend-driven auth before advanced module integration.
- Move workflow invariants to backend services with tests.
