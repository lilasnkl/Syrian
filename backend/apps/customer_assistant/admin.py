from django.contrib import admin

from apps.customer_assistant.models import AssistantCitation, AssistantSession, AssistantTurn


@admin.register(AssistantSession)
class AssistantSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "customer", "provider", "service", "order", "status", "updated_at")
    list_filter = ("status",)
    search_fields = ("customer__email", "provider__display_name")


@admin.register(AssistantTurn)
class AssistantTurnAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "customer", "provider", "answer_status", "model", "created_at")
    list_filter = ("answer_status", "model")
    search_fields = ("question", "answer", "customer__email", "provider__display_name")


@admin.register(AssistantCitation)
class AssistantCitationAdmin(admin.ModelAdmin):
    list_display = ("id", "turn", "source", "chunk", "rank", "relevance_score")
    search_fields = ("quote", "source__title", "provider__display_name")

