# Process Inventory

## Level 1 overview
- `Process_Customer`: customer marketplace journey from need identification to review, cancellation, or complaint.
- `Process_Provider`: provider onboarding, publishing, bidding, execution, and completion.
- `Process_Platform`: system orchestration of auth, verification, discovery, RAG, orders, bids, fulfillment, complaints, reviews, notifications, and analytics.
- `Process_Admin`: dashboard review, verification decisions, complaint response, and account moderation.
- `Process_Ollama`: external/local recommendation analysis.
- `Process_OpenAI`: embedding and structured answer generation.

## Subprocesses
- `Sub_Auth`: cookie JWT, refresh token, CSRF support, role lookup, active/blocked status, permission failure.
- `Sub_ProviderReadiness`: provider role check, verification evidence storage, admin review, approval, rejection, revocation, service publishing.
- `Sub_Discovery`: provider/service filters, Ollama problem analysis, JSON cleanup, retry, provider ranking.
- `Sub_KnowledgeRag`: source upload, queued ingestion, extraction, chunking, OpenAI embeddings, vector sync, customer retrieval, OpenAI answer, citation persistence.
- `Sub_OrderSubmission`: customer-only order creation, service reference validation, category matching, targeted-provider notification, open-market visibility.
- `Sub_BidWorkflow`: bid eligibility, duplicate detection, bid creation, customer decision, acceptance, rejection, withdrawal, order status sync.
- `Sub_NotificationsAudit`: in-app notifications, status histories, complaint action logs, role-filtered visibility.
- `Sub_FulfillmentChat`: conversation reuse, message notifications, completion/cancellation/dispute transition.
- `Sub_ComplaintModeration`: complaint creation, admin notification, admin response, resolved/dismissed/escalated outcomes, moderation action.
- `Sub_ReviewRating`: completed-order review validation, review creation, provider rating aggregate refresh.

## Events
- Start events: service need, provider join, admin queue notification, marketplace request received, AI service requests.
- Message events: provider verification result, eligible request available, OpenAI/Ollama requests and responses.
- Error boundary events: OpenAI embedding failure and OpenAI answer failure in `Sub_KnowledgeRag`.
- End events: request completed, cancelled, validation failed, provider rejected/revoked, no offer, complaint resolved/escalated, insufficient evidence, external AI failure.

## Gateways and decisions
- `Gateway_PlatformAuth`: authenticated and active?
- `Gateway_PlatformProviderApproved`: provider approved or provider readiness not required?
- `Gateway_PlatformRequestValid`: request valid and visible?
- `Gateway_PlatformOfferAccepted`: offer accepted?
- `Gateway_PlatformFulfillmentOutcome`: completed, cancelled, or disputed?
- `Gateway_BidEligible`: provider eligible to bid?
- `Gateway_BidDecision`: accept offer?
- `Gateway_BidPendingRemain`: accepted, still open, or cancelled?
- `Gateway_RagEvidence`: relevant evidence available?
- `Gateway_ComplaintOutcome`: resolved, dismissed, or escalated?

## Exception paths
- Invalid login, invalid token, missing refresh token, blocked account.
- Non-customer order creation.
- Inactive service reference.
- Service/category mismatch.
- Unauthorized order or bid visibility.
- Out-of-category bid.
- Duplicate bid.
- Updating non-pending bid or non-open order.
- Invalid order transition.
- Rejecting the last offer cancels an order.
- Complaint access restricted to complainant/admin/moderator.
- Review blocked unless order is completed, owned by customer, has awarded provider, and lacks prior review.
- Knowledge file missing, oversized, unsupported type, or actor not provider.
- OpenAI SDK/API key missing or OpenAI request failure.
- Ollama unavailable or invalid/incomplete analysis after retry.
- Zvec unavailable or empty, with fallback to Postgres JSON retrieval.

## Data update paths
- User registration/login/profile/status/password.
- Provider profile, verification requests, and verification status.
- Service listing create/update/delete.
- Order create/update/status history.
- Bid create/update/status history.
- Conversation, messages, read state.
- Complaint, complaint response, complaint action log.
- Review, review aggregate, provider rating and review count.
- Notification, notification read state.
- Knowledge source/document/chunk/job lifecycle.
- Assistant session/turn/citation/usage/cache metadata.

## Not modeled as implemented payment flow
No payment gateway, customer charge, provider payout, invoice, refund, or settlement process was found. Accepted bid amounts feed earnings and revenue dashboards only.
