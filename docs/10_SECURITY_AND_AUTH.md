# 10 Security and Auth

## Authentication
- JWT access and refresh tokens.
- Tokens stored in HttpOnly cookies.
- CSRF token propagation is prepared in API responses and frontend HTTP client contract.
- Refresh token revocation uses JWT blacklist strategy.

## Authorization
- Role-based access control: customer, provider, admin, moderator.
- Ownership checks enforced in backend service layer.
- Guarded workflow transitions with permission checks.
- Order view permissions now enforce participant/category constraints by role.
- Bid detail permissions now enforce participant/admin-only visibility.

## Security Controls
- Validation-first API design.
- Safe error responses without sensitive leakage.
- Audit-ready moderation paths.
- Blocked account restrictions across write operations.

## Pending Security Hardening
- Complete browser-level CSRF/cookie validation across deployment origins.
- Add security-focused integration tests for cross-origin/session edge cases.
- Add explicit audit logging persistence for moderation and sensitive mutations.