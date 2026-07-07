# Assumptions and Gaps

## Assumptions made while modeling
- The BPMN shows an enterprise value flow, not a single HTTP request. Provider readiness, customer discovery, order fulfillment, and moderation are therefore connected as one reviewable process.
- Collapsed subprocesses represent detailed code-backed workflows. Their internal tasks are present in the BPMN XML and expanded in `process-inventory.md`.
- Admin and moderator are modeled in the same pool because backend services grant them similar operational powers for verification, complaints, dashboard, and status changes.
- Frontend `client` is mapped to backend `customer` based on `frontend/src/features/auth/role.ts`.
- "Revenue" and "earnings" are modeled as reporting metrics only, because they are derived from accepted bids.

## Gaps found in the repository
- No payment gateway, checkout, payout, refund, invoice, bank API, or transaction ledger implementation was found.
- No email/SMS provider integration was found. Notifications are currently in-app database records; delivery preferences/logs exist as models.
- Bid expiration status exists, but no scheduler, cron job, or service transition for expiring bids was found.
- Knowledge ingestion has a management command and optional process-now path, but no Celery/Redis production worker is wired in this repository.
- Security docs identify explicit audit logging persistence as pending. The implementation has order/bid histories and complaint action logs, but not a generalized audit log.
- Review service exists but no dedicated review test file was found.
- Provider verification rejection does not appear to notify the provider, while revocation does.
- RAG safety preprocessing described in architecture docs is not fully implemented as redaction/malware scanning.
- Frontend roles expose `client`, `provider`, and `admin`; moderator is mapped to `admin` for frontend route purposes.

## Open questions for stakeholders
- Should the marketplace require provider verification before bidding, or only before being shown as verified?
- Should service requests support payment capture, escrow, provider payout, refunds, or invoices?
- Should rejected provider verification requests notify the provider with rejection reason?
- What SLA should apply to bid expiration, verification review, complaint response, and source ingestion?
- Should admins review public knowledge sources before activation?
- Should external email/SMS/push channels be added to notification delivery?
- What audit log retention and privacy policy should govern moderation, assistant turns, and uploaded provider documents?

## Validation limitation
No installed BPMN schema validator or Camunda/bpmn.io renderer was found in the repository dependencies. A structural validator checked XML well-formedness, start/end events, sequence-flow endpoints, gateway names, message-flow participant boundaries, and orphaned flow nodes. SVG rendering was generated from the same BPMN layout coordinates and XML-parsed for well-formedness.
