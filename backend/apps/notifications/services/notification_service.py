from apps.accounts.models import User
from apps.notifications.models import Notification
from shared.constants import ACTIVE, ROLE_ADMIN, ROLE_MODERATOR


class NotificationService:
    ADMIN_VISIBLE_TYPES = [Notification.TYPE_COMPLAINT, Notification.TYPE_VERIFICATION]

    @staticmethod
    def create(*, recipient, type, title, description="", link=""):
        return Notification.objects.create(
            recipient=recipient,
            type=type,
            title=title,
            description=description,
            link=link,
        )

    @staticmethod
    def create_for_admins(*, type, title, description="", link=""):
        recipients = User.objects.filter(role__in=[ROLE_ADMIN, ROLE_MODERATOR], status=ACTIVE)
        return [
            Notification.objects.create(
                recipient=recipient,
                type=type,
                title=title,
                description=description,
                link=link,
            )
            for recipient in recipients
        ]

    @staticmethod
    def visible_queryset_for_user(*, user):
        queryset = Notification.objects.filter(recipient=user)
        if user.role in {ROLE_ADMIN, ROLE_MODERATOR}:
            queryset = queryset.filter(type__in=NotificationService.ADMIN_VISIBLE_TYPES)
        return queryset.order_by("-created_at")

    @staticmethod
    def mark_read(*, notification, actor):
        if notification.recipient_id != actor.id:
            raise PermissionError("Cannot mark another user's notification.")
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return notification

    @staticmethod
    def mark_all_read(*, actor):
        NotificationService.visible_queryset_for_user(user=actor).filter(is_read=False).update(is_read=True)
