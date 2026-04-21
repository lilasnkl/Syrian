# Local Development Credentials Only

This file is **strictly for local development**.

- Do not use these credentials in production.
- Do not reuse these passwords in any non-local environment.
- Rotate or replace these credentials before any shared/staging deployment.

## Seeded Accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| admin | admin@local.syrianservices | Admin12345! | Superuser + staff admin account |
| moderator | moderator@local.syrianservices | User12345! | Staff moderator account |
| customer | noor.customer@local.syrianservices | User12345! | Local test customer (Damascus) |
| customer | sami.customer@local.syrianservices | User12345! | Local test customer (Aleppo) |
| provider | layla.provider@local.syrianservices | User12345! | Provider account with profile/services |
| provider | omar.provider@local.syrianservices | User12345! | Provider account with profile/services |
| provider | rana.provider@local.syrianservices | User12345! | Provider account with profile/services |

## Source of Truth 

These credentials are aligned with:

- `python manage.py seed_local_data --admin-password "Admin12345!" --default-password "User12345!"`
- Account emails defined in `backend/apps/accounts/management/commands/seed_local_data.py`
