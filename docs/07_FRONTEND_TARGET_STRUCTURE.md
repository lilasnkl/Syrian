# 07 Frontend Target Structure

## Target Frontend Architecture
```text
frontend/src/
  app/
  routes/
  pages/
  features/
    auth/
    providers/
    services/
    orders/
    bids/
    chat/
    complaints/
    reviews/
    notifications/
    admin/
  api/
  components/
  layouts/
  hooks/
  store/
  utils/
  types/
  styles/
```

## Feature Boundaries
- `features/*` own domain hooks, service adapters, and feature-level UI composition.
- `pages/*` remain route entry points, delegating behavior to feature hooks.
- `api/*` contains HTTP client, endpoint contracts, and error normalization.

## Route Organization
- Centralized route table and guard wrappers.
- Stable user-facing URLs preserved during migration.
- Role and ownership checks expressed at route and component levels.

## Shared Component Strategy
- Preserve existing reusable UI atoms/molecules.
- Move layout and navigation into `layouts/`.
- Keep domain-independent components in `components/`.

## API Integration Strategy
- Introduce typed API client and module endpoint wrappers.
- Replace mock stores module-by-module with feature hooks backed by React Query.
- Keep temporary adapters to avoid UI breakage during migration.

## State Management Strategy
- React Query for server state.
- Lightweight local state only for ephemeral UI concerns.
- Gradual reduction of domain logic in Zustand stores.

## Auth and Permission UI Strategy
- Dedicated auth feature context/hook.
- Guard composition without render-time side effects.
- Role-aware UI rendering remains in place but driven by backend-authenticated user state.

## Migration Approach
1. Add architecture scaffolding and API client.
2. Refactor route guards and route config.
3. Migrate auth first.
4. Migrate domains in order: providers, services, orders, bids, chat, reviews, complaints, notifications, admin.
5. Remove mock data/store branches after backend parity.
