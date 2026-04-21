from rest_framework import status
from rest_framework.views import exception_handler
from rest_framework.exceptions import ValidationError, AuthenticationFailed, NotAuthenticated, PermissionDenied, NotFound

from shared.responses import error_payload
from .custom_exceptions import (
    BusinessRuleViolation,
    ExternalServiceError,
    InvalidStateTransition,
    PermissionDeniedDomain,
    ResourceNotFound,
)


def custom_exception_handler(exc, context):
    if isinstance(exc, ValidationError):
        return _response("validation_error", "validation_error", exc.detail, status.HTTP_400_BAD_REQUEST)
    if isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
        return _response("authentication_error", "authentication_error", {"detail": str(exc)}, status.HTTP_401_UNAUTHORIZED)
    if isinstance(exc, (PermissionDenied, PermissionDeniedDomain)):
        return _response("permission_error", "permission_error", {"detail": str(exc)}, status.HTTP_403_FORBIDDEN)
    if isinstance(exc, (NotFound, ResourceNotFound)):
        return _response("not_found", "not_found", {"detail": str(exc)}, status.HTTP_404_NOT_FOUND)
    if isinstance(exc, (BusinessRuleViolation, InvalidStateTransition)):
        code = getattr(exc, "code", "business_rule_violation")
        details = getattr(exc, "details", {"detail": str(exc)})
        return _response("business_rule_violation", code, details, status.HTTP_409_CONFLICT)
    if isinstance(exc, ExternalServiceError):
        code = getattr(exc, "code", "external_service_error")
        details = getattr(exc, "details", {"detail": str(exc)})
        return _response("external_service_error", code, details, status.HTTP_503_SERVICE_UNAVAILABLE)

    response = exception_handler(exc, context)
    if response is None:
        return _response("server_error", "server_error", {"detail": "Unexpected server error."}, status.HTTP_500_INTERNAL_SERVER_ERROR)

    return response


def _response(error_type, code, details, status_code):
    from rest_framework.response import Response

    return Response(error_payload(error_type, code, details), status=status_code)
