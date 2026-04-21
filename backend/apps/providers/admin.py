from django.contrib import admin

from .models import ProviderProfile, VerificationRequest


@admin.register(ProviderProfile)
class ProviderProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "display_name", "user", "category", "is_verified", "created_at")
    list_filter = ("category", "is_verified")
    search_fields = ("display_name", "user__email", "location")


@admin.register(VerificationRequest)
class VerificationRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "provider", "status", "submitted_at", "reviewed_at")
    list_filter = ("status",)
    search_fields = ("provider__display_name", "provider__user__email")
