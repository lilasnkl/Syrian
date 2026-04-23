from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.recommendations.services import ProblemAnalysisService, ProviderRecommendationService

from .serializers import RecommendProvidersRequestSerializer, RecommendProvidersResponseSerializer


class RecommendProvidersView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RecommendProvidersRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        analysis = ProblemAnalysisService.analyze(
            serializer.validated_data["problem_description"],
            language=serializer.validated_data.get("language", "en"),
        )
        top_providers = ProviderRecommendationService.recommend(
            analysis=analysis,
            user_lat=serializer.validated_data.get("user_lat"),
            user_lng=serializer.validated_data.get("user_lng"),
            budget=serializer.validated_data.get("budget"),
            limit=3,
        )

        response_payload = {
            "analysis": analysis,
            "top_providers": top_providers,
        }
        response_serializer = RecommendProvidersResponseSerializer(data=response_payload)
        response_serializer.is_valid(raise_exception=True)
        return Response(response_serializer.validated_data)
