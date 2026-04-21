# 13 Coding Standards

## General
- Keep code modular and intention-revealing.
- Apply SOLID principles and single responsibility.
- Keep side effects explicit and testable.

## Backend
- Thin views, rich services, explicit repositories/selectors.
- No business rules in serializers/models unless intrinsic validation.
- Uniform responses and error handling.

## Frontend
- Keep route URLs stable during refactor.
- Keep UI and domain logic separated via feature hooks/services.
- Prefer typed contracts and avoid `any`.

## Documentation and Tracking
- Update docs and tracking files on each major change set.
- Record decisions and tradeoffs in `tracking/DECISIONS.md`.
