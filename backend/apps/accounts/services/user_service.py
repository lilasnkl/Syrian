from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from apps.notifications.models import Notification
from apps.notifications.services import NotificationService
from shared.exceptions import BusinessRuleViolation, PermissionDeniedDomain, ResourceNotFound
from shared.constants import ACTIVE, BLOCKED

from apps.accounts.repositories import UserRepository


class UserService:
    @staticmethod
    def update_profile(*, actor, user_id: int, attrs: dict):
        user = UserRepository.get_by_id(user_id)
        if not user:
            raise ResourceNotFound("User not found.")

        if actor.id != user.id and actor.role not in {"admin", "moderator"}:
            raise PermissionDeniedDomain("Not allowed to update this user.")

        if user.status != ACTIVE and actor.role not in {"admin", "moderator"}:
            raise PermissionDeniedDomain("Blocked account cannot be updated.")

        safe_attrs = {k: v for k, v in attrs.items() if k in {"first_name", "last_name", "phone", "location"}}
        return UserRepository.save(user, **safe_attrs)

    @staticmethod
    def update_status(*, actor, user_id: int, status: str, blocked_reason: str = ""):
        user = UserRepository.get_by_id(user_id)
        if not user:
            raise ResourceNotFound("User not found.")

        if actor.role not in {"admin", "moderator"}:
            raise PermissionDeniedDomain("Only admin or moderator can update account status.")

        if actor.id == user.id:
            raise PermissionDeniedDomain("You cannot update your own account status.")

        if status == BLOCKED and not blocked_reason.strip():
            raise BusinessRuleViolation("Block reason is required.", code="block_reason_required")

        next_attrs = {
            "status": status,
            "blocked_reason": blocked_reason.strip() if status == BLOCKED else "",
        }
        updated_user = UserRepository.save(user, **next_attrs)

        if status == BLOCKED:
            NotificationService.create(
                recipient=updated_user,
                type=Notification.TYPE_SYSTEM,
                title="Account blocked",
                description=blocked_reason.strip(),
                link="/",
            )

        return updated_user

    @staticmethod
    def change_password(*, actor, current_password: str, new_password: str):
        if actor.status != ACTIVE:
            raise PermissionDeniedDomain("Blocked account cannot change password.")

        if not actor.check_password(current_password):
            raise BusinessRuleViolation(
                "Current password is incorrect.",
                code="invalid_current_password",
                details={"current_password": ["Current password is incorrect."]},
            )

        if current_password == new_password:
            raise BusinessRuleViolation(
                "New password must be different from the current password.",
                code="password_unchanged",
                details={"new_password": ["New password must be different from the current password."]},
            )

        try:
            validate_password(new_password, actor)
        except DjangoValidationError as exc:
            raise BusinessRuleViolation(
                "New password is invalid.",
                code="invalid_new_password",
                details={"new_password": list(exc.messages)},
            )

        actor.set_password(new_password)
        actor.save(update_fields=["password", "updated_at"])
        return actor
