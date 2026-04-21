from rest_framework import serializers

from apps.bids.models import Bid


class BidSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source="order.id", read_only=True)
    order_title = serializers.CharField(source="order.title", read_only=True)
    provider_id = serializers.IntegerField(source="provider.id", read_only=True)
    provider_name = serializers.CharField(source="provider.display_name", read_only=True)
    provider_rating = serializers.DecimalField(source="provider.rating", max_digits=3, decimal_places=2, read_only=True)

    class Meta:
        model = Bid
        fields = [
            "id",
            "order_id",
            "order_title",
            "provider_id",
            "provider_name",
            "provider_rating",
            "amount",
            "message",
            "estimated_duration",
            "status",
            "created_at",
            "updated_at",
        ]


class BidCreateUpdateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    message = serializers.CharField(required=False, allow_blank=True)
    estimated_duration = serializers.CharField(max_length=120)


class BidStatusActionSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True)
