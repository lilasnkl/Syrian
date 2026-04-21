# OPEN QUESTIONS

## Unresolved Business Questions
- What is the final dispute escalation SLA and moderator escalation hierarchy?
- Which categories and pricing models are mandatory at launch?
- Should customer “delete request” UX map to soft-cancel only, or should a hard-delete endpoint exist?

## Unresolved UX Questions
- Should order and bid timelines be surfaced as separate activity feeds?
- Should admins impersonate users/providers for support diagnostics?
- Should withdrawn provider bids remain visible to customers in history tabs by default?

## Unresolved Integration Questions
- Preferred backend deployment topology and environment promotion policy?
- Which external services (email/SMS/push) are required for notification delivery in v1?
- Do we want server-driven avatars/media URLs instead of deterministic frontend-generated avatars?

## Assumptions Pending Confirmation
- Role mapping keeps frontend `client` label while backend canonical role is `customer`.
- PostgreSQL is the production target database.
- Chat remains polling-based for v1.