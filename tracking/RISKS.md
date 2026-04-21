# RISKS

## High Risks
- Non-core frontend domains (chat, complaints, notifications, parts of admin analytics) still include mock/local data paths and can drift from backend behavior.
- CSRF behavior is partially prepared but still needs browser-level validation across real deployment origins.

## Medium Risks
- API-backed store hydration currently refreshes whole marketplace slices after mutations, which is safe but can be chatty under heavy usage.
- i18n text quality and encoding normalization remains incomplete in several legacy UI strings.
- Frontend role translation (`customer` <-> `client`) is intentional but requires continued discipline as new modules are added.
- PostgreSQL-backed `pytest` requires DB role `CREATEDB`; missing privilege causes test setup failures.
- JWT cookie auth currently propagates CSRF token header from frontend, but strict server-side CSRF enforcement for JWT-authenticated unsafe methods is not fully hardened yet.

## Mitigations
- Prioritize migration of remaining mock-backed domains in the next phase.
- Add targeted React Query/domain-specific caching to reduce full-store hydration frequency.
- Run end-to-end browser security checks for cookie/CSRF behavior before deployment.
- Continue adding integration-sensitive tests whenever a domain is migrated.
- Document DB role prerequisites in local setup docs and `.env.example` usage guidance.
