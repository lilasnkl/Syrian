# Syrian Services BPMN Process Overview

## Process purpose
This model documents the end-to-end Syrian Services marketplace process: provider onboarding, customer discovery, order creation, provider bidding, order fulfillment, chat, complaints, reviews, notifications, and AI-assisted knowledge Q&A.

## Process scope
In scope: React SPA actions, Django/DRF API authorization, provider verification, service listings, orders, bids, chat, complaints, reviews, notifications, admin dashboard/moderation, provider knowledge ingestion, Ollama recommendations, and OpenAI-powered RAG answers.

Out of scope: real payment capture, refunds, banking, payment gateway settlement, and email/SMS delivery. The repository currently exposes provider earnings and admin revenue as read models derived from accepted bid amounts.

## Trigger events
- Customer identifies a service need and signs in or registers.
- Provider registers, submits verification evidence, publishes services, and uploads optional knowledge.
- Admin or moderator receives verification or complaint queue notifications.
- Customer asks AI recommendation or provider knowledge questions.

## Final outcomes
- Request completed, reviewed, and reflected in provider rating.
- Request cancelled because the customer cancelled, rejected offers, or no offer was accepted.
- Complaint resolved, dismissed, or escalated.
- Provider verification approved, rejected, or revoked.
- Knowledge answer returned, insufficient evidence returned, or external AI failure reported.

## Roles and responsibilities
- Customer: searches providers, asks assistant questions, creates requests, reviews offers, chats, files complaints, and reviews completed orders.
- Provider: maintains profile, submits verification evidence, manages services and knowledge sources, bids on eligible requests, performs work, and marks completion.
- Admin or moderator: reviews verification requests, handles complaints, blocks accounts, revokes verification, and reviews dashboard health.
- React Frontend: routes protected screens and maps frontend roles to backend canonical roles.
- Django API and domain services: enforce RBAC, ownership, validation, state transitions, persistence, notifications, and AI orchestration.
- Background worker or management command: processes queued knowledge ingestion jobs.
- Ollama: analyzes free-form service problems for provider recommendation.
- OpenAI APIs: generate embeddings and structured grounded answers for provider knowledge Q&A.

## Main happy path
1. Customer signs in, discovers providers, and optionally asks AI-supported questions.
2. Customer submits a valid service request.
3. Platform creates an open order, notifies a selected provider or exposes the request to matching providers.
4. Eligible provider submits an offer.
5. Customer accepts the selected offer.
6. Platform accepts that bid, rejects competing pending bids, awards the provider, and moves the order to in progress.
7. Customer and provider communicate through chat while work is performed.
8. Provider marks the order completed.
9. Customer creates a review, and the platform refreshes provider rating aggregates.

## Alternative and exception paths
- Authentication failure, permission failure, or blocked account returns a structured error.
- Invalid request fields, inactive selected service, or service/category mismatch fails validation.
- Provider cannot bid on another provider's targeted service request.
- Provider cannot bid outside their own category.
- Duplicate bids are rejected.
- Rejecting the last pending offer cancels the order.
- Order participants, admins, or moderators can dispute an order.
- Complaints notify admins/moderators and are resolved, dismissed, or escalated.
- OpenAI/Ollama failures return structured external service errors or insufficient-evidence answers.
- Knowledge source ingestion failures mark source and job as failed.

## Data objects and stores
User accounts, provider profiles, verification requests/files, service listings, orders/status history, bids/status history, conversations/messages, complaints/action logs, reviews/rating aggregates, notifications, knowledge sources/documents/chunks, assistant turns/citations, PostgreSQL or SQLite, media storage, vector index, and cache.

## Business rules
- Only customers create orders.
- Only providers create service listings and bids.
- Service-targeted requests are visible only to the selected provider.
- Open-market requests are visible to providers in the same category.
- Accepted bids reject competing pending bids and move the order to in progress.
- Only completed orders can be reviewed, and only once.
- Admin/moderator privileges are required for verification decisions, complaint responses, account blocking, and admin dashboard access.

## Security and authorization rules
JWT access and refresh tokens are stored in HttpOnly cookies. CSRF headers are exposed for frontend propagation. Backend services enforce role checks, active account checks, ownership checks, participant visibility, provider knowledge visibility policy, and server-side OpenAI API key use.

## Assumptions
The main BPMN is an enterprise overview, so subprocesses are collapsed in the visible diagram and expanded in the BPMN XML plus inventory. Provider readiness is shown as part of marketplace value flow even though individual customer requests may not require a verification step at request time.

## Open questions
See `assumptions-and-gaps.md` for payment, bid expiration, audit persistence, email/SMS delivery, and production background-worker gaps.
