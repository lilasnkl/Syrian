from rest_framework.permissions import BasePermission

from shared.constants import ROLE_ADMIN, ROLE_CUSTOMER, ROLE_MODERATOR, ROLE_PROVIDER


class IsAdminOrModerator(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {ROLE_ADMIN, ROLE_MODERATOR}
        )


class IsProvider(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == ROLE_PROVIDER)


class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == ROLE_CUSTOMER)


class IsActiveAccount(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.status == "active")
