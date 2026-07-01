from apps.customer_assistant.models import AssistantSession


def assistant_sessions_queryset():
    return AssistantSession.objects.select_related("customer", "provider", "provider__user", "order", "service").all().order_by("-updated_at")

