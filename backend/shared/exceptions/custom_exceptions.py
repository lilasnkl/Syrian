class DomainException(Exception):
    default_code = "domain_error"
    default_detail = "Domain error."

    def __init__(self, detail=None, code=None, details=None):
        super().__init__(detail or self.default_detail)
        self.detail = detail or self.default_detail
        self.code = code or self.default_code
        self.details = details or {}


class BusinessRuleViolation(DomainException):
    default_code = "business_rule_violation"
    default_detail = "Business rule violated."


class PermissionDeniedDomain(DomainException):
    default_code = "permission_denied"
    default_detail = "You do not have permission to perform this action."


class InvalidStateTransition(DomainException):
    default_code = "invalid_state_transition"
    default_detail = "Invalid state transition requested."


class ResourceNotFound(DomainException):
    default_code = "not_found"
    default_detail = "Resource not found."


class ExternalServiceError(DomainException):
    default_code = "external_service_error"
    default_detail = "External service request failed."
