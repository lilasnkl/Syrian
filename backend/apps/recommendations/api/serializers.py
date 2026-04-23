from decimal import Decimal

from rest_framework import serializers


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
