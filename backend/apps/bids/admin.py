from django.contrib import admin

from .models import Bid, BidStatusHistory


@admin.register(Bid)
class BidAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "provider", "amount", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("order__title", "provider__display_name")


@admin.register(BidStatusHistory)
class BidStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("id", "bid", "from_status", "to_status", "changed_by", "created_at")
