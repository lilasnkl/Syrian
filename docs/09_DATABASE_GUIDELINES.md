# 09 Database Guidelines

## Database Engine
- PostgreSQL for production
- SQLite optional for local development bootstrap

## Environment Configuration
- Database config is environment-driven through `backend/config/settings/base.py`.
- Preferred options:
  - `DATABASE_URL=postgresql://user:password@host:port/database`
  - or explicit variables: `DB_ENGINE`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`.
- Local template is provided at `backend/.env.example`.

## Modeling Rules
- Normalize core transactional entities
- Use explicit foreign keys and cascade policies
- Add `created_at` and `updated_at` to major entities
- Use status enums for workflow-driven entities

## Local Seed Strategy
- Seed command: `python manage.py seed_local_data`
- The command is idempotent (`update_or_create`/`get_or_create`) and safe to rerun.
- Seed scope:
  - 1 admin user (superuser)
  - 1 moderator
  - 2 customers
  - 3 provider users with linked `ProviderProfile` rows
  - 6 `ServiceListing` rows linked to providers
  - Optional sample `Order` + `Bid` records (enabled by default, can be skipped with `--skip-orders-bids`)
- Password overrides are supported via:
  - `SEED_ADMIN_PASSWORD`
  - `SEED_DEFAULT_PASSWORD`

## Workflow States
- Order: `open -> awarded -> in_progress -> completed` (+ cancelled/disputed)
- Bid: `pending -> accepted/rejected/withdrawn` (+ expired)
- Complaint: `open -> in_review -> resolved/dismissed` (+ escalated)
- Notification: `unread -> read`

## Indexing Priorities
- `(role, status)`
- `(provider_id, status)`
- `(customer_id, status)`
- `(order_id, status)`
- `(conversation_id, created_at)`
- `(recipient_id, read, created_at)`
