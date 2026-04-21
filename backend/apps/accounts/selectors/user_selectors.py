from django.db.models import QuerySet

from apps.accounts.models import User


def list_users() -> QuerySet[User]:
    return User.objects.all().order_by("-created_at")
