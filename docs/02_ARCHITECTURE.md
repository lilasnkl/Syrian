# 02 Architecture

## Architecture Statement
The system follows a Client-Server Architecture.
The backend is organized using a 3-Layer Architecture (Presentation, Business Logic, Data Access) within a Modular Monolith design.
SOLID principles are applied to improve maintainability, scalability, and code quality.

## System-Level View
- Client: React SPA
- Server: Django + DRF API
- Database: PostgreSQL

## Backend Layer Mapping
- Presentation Layer: `apps/<module>/api/`
- Business Logic Layer: `apps/<module>/services/`
- Data Access Layer: `apps/<module>/repositories/`, `apps/<module>/selectors/`, `apps/<module>/models/`

## Modular Monolith Rules
- Modules own their domain logic and storage concerns.
- Inter-module calls pass through services/selectors, not direct model coupling.
- Shared cross-cutting behavior lives in `backend/shared/`.

## SOLID Application
- Single Responsibility: one reason to change per class/function.
- Open-Closed: extensible service/repository interfaces.
- Liskov: consistent serializer/service contracts.
- Interface Segregation: narrow service/repository methods.
- Dependency Inversion: views depend on services, services depend on repository abstractions.
