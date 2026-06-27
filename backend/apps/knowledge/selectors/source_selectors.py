from apps.knowledge.models import KnowledgeSource


def knowledge_sources_queryset():
    return KnowledgeSource.objects.select_related("provider", "provider__user", "created_by").all().order_by("-created_at")

