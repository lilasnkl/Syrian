from django.contrib import admin

from .models import ServiceListing


@admin.register(ServiceListing)
class ServiceListingAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "provider", "category", "price", "price_type", "is_active", "created_at")
    list_filter = ("category", "price_type", "is_active")
    search_fields = ("title", "provider__display_name", "description")
