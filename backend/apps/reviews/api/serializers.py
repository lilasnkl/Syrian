from rest_framework import serializers

from apps.reviews.models import Review


class ReviewSerializer(serializers.ModelSerializer):
    provider_id = serializers.IntegerField(source="provider.id", read_only=True)
    customer_id = serializers.IntegerField(source="customer.id", read_only=True)

    class Meta:
        model = Review
        fields = ["id", "order", "provider_id", "customer_id", "rating", "comment", "is_flagged", "created_at"]


class ReviewCreateSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True)
