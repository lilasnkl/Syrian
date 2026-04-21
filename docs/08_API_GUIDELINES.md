# 08 API Guidelines

## Base Rules
- Base path: `/api/v1/`
- RESTful resource naming and HTTP semantics
- Explicit pagination, filtering, and sorting controls

## Response Contracts
- Success: `{ "success": true, "message": "...", "data": ..., "meta": ... }`
- Validation error: `{ "success": false, "error": { "type": "validation_error", "code": "...", "details": {...} } }`
- Authentication error: type `authentication_error`, HTTP 401
- Permission error: type `permission_error`, HTTP 403
- Business rule error: type `business_rule_violation`, HTTP 409
- Not found: type `not_found`, HTTP 404

## API Consistency
- Serializer validation for all inputs
- Service layer for workflow actions and transitions
- Structured error codes for client handling
- Stable contracts versioned under `/api/v1`
