from rest_framework import serializers
from django.urls import reverse

from apps.providers.models import ProviderProfile, VerificationRequest


class ProviderProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = ProviderProfile
        fields = [
            "id",
            "user_id",
            "display_name",
            "bio",
            "category",
            "location",
            "hourly_rate",
            "years_experience",
            "is_verified",
            "skills",
            "availability",
            "response_time",
            "rating",
            "review_count",
            "completed_jobs",
            "created_at",
            "updated_at",
        ]


class ProviderProfileUpdateSerializer(serializers.Serializer):
    display_name = serializers.CharField(required=False, max_length=255)
    bio = serializers.CharField(required=False, allow_blank=True)
    category = serializers.CharField(required=False, max_length=60)
    location = serializers.CharField(required=False, allow_blank=True, max_length=255)
    hourly_rate = serializers.DecimalField(required=False, max_digits=10, decimal_places=2)
    years_experience = serializers.IntegerField(required=False, min_value=0)
    skills = serializers.ListField(required=False, child=serializers.CharField())
    availability = serializers.CharField(required=False, allow_blank=True, max_length=255)
    response_time = serializers.CharField(required=False, allow_blank=True, max_length=120)


class VerificationRequestSerializer(serializers.ModelSerializer):
    provider_id = serializers.IntegerField(source="provider.id", read_only=True)
    provider_name = serializers.CharField(source="provider.display_name", read_only=True)
    provider_category = serializers.CharField(source="provider.category", read_only=True)
    files = serializers.SerializerMethodField()

    class Meta:
        model = VerificationRequest
        fields = [
            "id",
            "provider_id",
            "provider_name",
            "provider_category",
            "documents",
            "description",
            "files",
            "years_experience",
            "service_areas",
            "status",
            "rejection_reason",
            "submitted_at",
            "reviewed_at",
            "reviewed_by",
        ]

    def get_files(self, instance):
        request = self.context.get("request")
        return [
            {
                "name": file_meta.get("name", "file"),
                "type": file_meta.get("type", "application/octet-stream"),
                "size": file_meta.get("size", 0),
                "url": (
                    request.build_absolute_uri(
                        reverse(
                            "providers-verification-file",
                            kwargs={"verification_id": instance.id, "file_index": index},
                        )
                    )
                    if request
                    else reverse(
                        "providers-verification-file",
                        kwargs={"verification_id": instance.id, "file_index": index},
                    )
                ),
            }
            for index, file_meta in enumerate(instance.files or [])
        ]


class SubmitVerificationSerializer(serializers.Serializer):
    documents = serializers.ListField(required=True, child=serializers.CharField())
    description = serializers.CharField(required=False, allow_blank=True)
    files = serializers.ListField(required=False, child=serializers.FileField(), allow_empty=True)
    years_experience = serializers.IntegerField(required=False, min_value=0, allow_null=True)
    service_areas = serializers.ListField(required=False, child=serializers.CharField(), allow_empty=True)


class ReviewVerificationSerializer(serializers.Serializer):
    approve = serializers.BooleanField()
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
