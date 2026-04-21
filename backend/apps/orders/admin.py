from django.contrib import admin

from .models import Order, OrderStatusHistory


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "customer", "category", "status", "budget", "created_at")
    list_filter = ("status", "category")
    search_fields = ("title", "description", "customer__email")


@admin.register(OrderStatusHistory)
class OrderStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "from_status", "to_status", "changed_by", "created_at")
    list_filter = ("to_status",)
