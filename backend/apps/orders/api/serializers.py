from rest_framework import serializers

from apps.orders.models import Order, OrderStatusHistory
from apps.services.models import ServiceListing


class OrderSerializer(serializers.ModelSerializer):
    customer_id = serializers.IntegerField(source="customer.id", read_only=True)
    customer_name = serializers.SerializerMethodField()
    awarded_provider_id = serializers.IntegerField(source="awarded_provider.id", read_only=True)
    bids_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "customer_id",
            "customer_name",
            "service",
            "title",
            "description",
            "category",
            "budget",
            "location",
            "urgency",
            "preferred_time",
            "status",
            "awarded_provider_id",
            "bids_count",
            "created_at",
            "updated_at",
        ]

    def get_customer_name(self, obj):
        full_name = f"{obj.customer.first_name} {obj.customer.last_name}".strip()
        return full_name or obj.customer.username or obj.customer.email

    def get_bids_count(self, obj):
        return obj.bids.count()


class OrderCreateUpdateSerializer(serializers.Serializer):
    service = serializers.PrimaryKeyRelatedField(
        queryset=ServiceListing.objects.all(),
        required=False,
        allow_null=True,
    )
    title = serializers.CharField(max_length=255)
    description = serializers.CharField()
    category = serializers.CharField(max_length=60)
    budget = serializers.DecimalField(max_digits=10, decimal_places=2)
    location = serializers.CharField(max_length=255)
    urgency = serializers.ChoiceField(choices=["low", "medium", "high"], default="medium")
    preferred_time = serializers.CharField(required=False, allow_blank=True, max_length=120)


class OrderTransitionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["cancelled", "completed", "in_progress", "disputed"])
    note = serializers.CharField(required=False, allow_blank=True, max_length=255)


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = ["id", "from_status", "to_status", "changed_by", "note", "created_at"]
