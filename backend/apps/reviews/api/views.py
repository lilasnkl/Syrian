from rest_framework import permissions
from rest_framework.views import APIView

from apps.reviews.models import Review
from apps.reviews.services import ReviewService
from shared.responses import success_response
from .serializers import ReviewCreateSerializer, ReviewSerializer


class ReviewListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = Review.objects.all()
        provider_id = request.query_params.get("provider_id")
        if provider_id:
            queryset = queryset.filter(provider_id=provider_id)
        return success_response(data={"reviews": ReviewSerializer(queryset, many=True).data}, message="Reviews list")

    def post(self, request):
        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = ReviewService.create_review(actor=request.user, **serializer.validated_data)
        return success_response(data={"review": ReviewSerializer(review).data}, message="Review created", status_code=201)


class ProviderReviewsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, provider_id: int):
        queryset = Review.objects.filter(provider_id=provider_id)
        return success_response(data={"reviews": ReviewSerializer(queryset, many=True).data}, message="Provider reviews")


urlpatterns = []
