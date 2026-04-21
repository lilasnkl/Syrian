from rest_framework import serializers

from apps.services.models import ServiceListing


class ServiceSerializer(serializers.ModelSerializer):
    provider_id = serializers.IntegerField(source="provider.id", read_only=True)
    provider_name = serializers.CharField(source="provider.display_name", read_only=True)

    class Meta:
        model = ServiceListing
        fields = [
            "id",
            "provider_id",
            "provider_name",
            "title",
            "description",
            "category",
            "price",
            "price_type",
            "duration",
            "is_active",
            "created_at",
            "updated_at",
        ]


class ServiceCreateUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField()
    category = serializers.CharField(max_length=60)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    price_type = serializers.ChoiceField(choices=["fixed", "hourly", "starting_at"])
    duration = serializers.CharField(required=False, allow_blank=True, max_length=120)
    is_active = serializers.BooleanField(required=False)
