from decimal import Decimal

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


class ProblemAnalysisSerializer(serializers.Serializer):
    service_category = serializers.CharField(allow_blank=True)
    provider_type = serializers.CharField(allow_blank=True)
    likely_issue = serializers.CharField(allow_blank=False)
    urgency = serializers.CharField(allow_blank=False)
    keywords = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    suggested_solution = serializers.CharField(allow_blank=False)
    quick_tips = serializers.ListField(child=serializers.CharField(), allow_empty=False)


class RecommendedProviderSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    rating = serializers.FloatField()
    distance = serializers.FloatField()
    price_range = serializers.CharField(allow_blank=True)
    score = serializers.FloatField()


class RecommendProvidersRequestSerializer(serializers.Serializer):
    problem_description = serializers.CharField(allow_blank=False, trim_whitespace=True)
    language = serializers.ChoiceField(required=False, choices=["en", "ar"], default="en")
    user_lat = serializers.FloatField(required=False, allow_null=True, min_value=-90, max_value=90)
    user_lng = serializers.FloatField(required=False, allow_null=True, min_value=-180, max_value=180)
    budget = serializers.DecimalField(
        required=False,
        allow_null=True,
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.00"),
    )

    def validate(self, attrs):
        user_lat = attrs.get("user_lat")
        user_lng = attrs.get("user_lng")
        if (user_lat is None) != (user_lng is None):
            raise serializers.ValidationError("user_lat and user_lng must be provided together.")
        return attrs


class RecommendProvidersResponseSerializer(serializers.Serializer):
    analysis = ProblemAnalysisSerializer()
    top_providers = RecommendedProviderSerializer(many=True)


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
