# Syrian Services Marketplace Platform

Production-grade full-stack service marketplace built with a React + TypeScript frontend and a Django + DRF modular monolith backend.

## Architecture Statement
The system follows a Client-Server Architecture.
The backend is organized using a 3-Layer Architecture (Presentation, Business Logic, Data Access) within a Modular Monolith design.
SOLID principles are applied to improve maintainability, scalability, and code quality.

## Repository Structure
- `frontend/`: Existing Lovable-generated React application, incrementally stabilized and refactored.
- `backend/`: Django + DRF modular monolith with domain modules.
- `docs/`: System, architecture, domain, API, security, and delivery documentation.
- `tracking/`: Work management, decisions, risks, changelog, and open questions.

## Technology Stack
- Frontend: React, TypeScript, Vite, Tailwind, shadcn/ui, React Router, React Query, Zustand (transitioning to API-oriented state)
- Backend: Django, Django REST Framework, SimpleJWT, modular apps with service layer
- Database: PostgreSQL (preferred for production)

## Core Domains
- accounts
- providers
- services
- orders
- bids
- chat
- complaints
- reviews
- notifications
- admin_panel

## Delivery Approach
1. Audit and preserve frontend value.
2. Stabilize frontend architecture incrementally.
3. Build backend modular monolith foundation.
4. Integrate frontend with backend contracts.
5. Deliver domain modules with strict permissions and workflow integrity.
6. Harden quality, tests, and documentation.

## Security Baseline
- JWT authentication with HttpOnly cookies and CSRF protection
- Role-based authorization with ownership checks
- Validation-first API design with consistent error contracts
- Audit-friendly moderation and dispute actions

## Current Status (2026-03-22)
- Frontend audit and target migration structure completed and documented.
- Backend modular monolith foundation is active with all required domain modules scaffolded.
- Auth/session migration completed: frontend now uses backend cookie-JWT login/register/logout/me flows.
- Providers/services/orders/bids frontend data paths are integrated through backend API adapters.
- Backend tests expanded to providers/services/orders/bids permissions and workflows (18 tests passing).
- Frontend integration-sensitive tests added for auth + marketplace store contracts (12 tests passing).

## Getting Started
### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend (after dependencies installed)
```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py seed_local_data
python manage.py runserver
```

### Local PostgreSQL Defaults
- Host: `localhost`
- Port: `5432`
- Database: `syrian-services`
- User: `postgres`
- Password: `1234`

### Seeded Local Accounts
- Admin: `admin@local.syrianservices` / `Admin12345!`
- Moderator: `moderator@local.syrianservices` / `User12345!`
- Customers:
  - `noor.customer@local.syrianservices` / `User12345!`
  - `sami.customer@local.syrianservices` / `User12345!`
- Providers:
  - `layla.provider@local.syrianservices` / `User12345!`
  - `omar.provider@local.syrianservices` / `User12345!`
  - `rana.provider@local.syrianservices` / `User12345!`

## Engineering Standards
- Keep business rules in backend service layer.
- Keep API transport logic in presentation layer.
- Keep persistence logic in repositories/selectors.
- Keep frontend routes stable while refactoring internals.
- Update docs and tracking files after major changes.
