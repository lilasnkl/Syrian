import json
from pathlib import Path

from decimal import Decimal, InvalidOperation

from django.core.files.storage import default_storage
from django.http import FileResponse
from rest_framework.parsers import JSONParser
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework import permissions
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView

from apps.providers.repositories import ProviderRepository
from apps.providers.selectors import get_provider_earnings_snapshot, providers_queryset, verification_queryset
from apps.providers.services import (
    ProviderService,
    VerificationService,
)
from shared.exceptions import PermissionDeniedDomain, ResourceNotFound
from shared.responses import success_response
from .serializers import (
    ProviderProfileSerializer,
    ProviderProfileUpdateSerializer,
    ReviewVerificationSerializer,
    SubmitVerificationSerializer,
    VerificationRequestSerializer,
)


class ProviderListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        queryset = providers_queryset()
        category = request.query_params.get("category")
        verified = request.query_params.get("verified")
        min_rating = request.query_params.get("min_rating")
        search = request.query_params.get("search")

        if category:
            queryset = queryset.filter(category=category)
        if verified in {"true", "false"}:
            queryset = queryset.filter(is_verified=(verified == "true"))
        if min_rating:
            try:
                min_rating_value = Decimal(min_rating)
            except (InvalidOperation, TypeError):
                raise ValidationError({"min_rating": ["Enter a valid rating value."]})

            queryset = queryset.filter(rating__gte=min_rating_value)
        if search:
            queryset = queryset.filter(display_name__icontains=search)

        serializer = ProviderProfileSerializer(queryset, many=True)
        return success_response(data={"providers": serializer.data}, message="Providers list")


class ProviderDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, provider_id: int):
        provider = ProviderRepository.get_by_id(provider_id)
        if not provider:
            raise ResourceNotFound("Provider not found.")
        return success_response(data={"provider": ProviderProfileSerializer(provider).data}, message="Provider detail")


class MyProviderProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        provider = ProviderService.get_or_create_for_user(request.user)
        return success_response(data={"provider": ProviderProfileSerializer(provider).data}, message="My provider profile")

    def patch(self, request):
        serializer = ProviderProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        provider = ProviderService.update_profile(actor=request.user, attrs=serializer.validated_data)
        return success_response(data={"provider": ProviderProfileSerializer(provider).data}, message="Provider profile updated")


class MyProviderEarningsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        provider = ProviderService.get_or_create_for_user(request.user)
        snapshot = get_provider_earnings_snapshot(provider)
        return success_response(data={"earnings": snapshot}, message="Provider earnings")


class SubmitVerificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    @staticmethod
    def _coerce_list(request, key):
        if hasattr(request.data, "getlist"):
            values = request.data.getlist(key)
            if values:
                return [value for value in values if value not in {None, ""}]

        raw_value = request.data.get(key)
        if raw_value is None or raw_value == "":
            return []

        if isinstance(raw_value, list):
            return raw_value

        if isinstance(raw_value, str):
            try:
                parsed = json.loads(raw_value)
            except json.JSONDecodeError:
                return [raw_value]
            return parsed if isinstance(parsed, list) else [raw_value]

        return [raw_value]

    def post(self, request):
        payload = {
            "documents": self._coerce_list(request, "documents"),
            "description": request.data.get("description", ""),
            "files": request.FILES.getlist("files"),
            "years_experience": request.data.get("years_experience") or None,
            "service_areas": self._coerce_list(request, "service_areas"),
        }
        serializer = SubmitVerificationSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        req = VerificationService.submit_request(actor=request.user, **serializer.validated_data)
        return success_response(
            data={"verification": VerificationRequestSerializer(req, context={"request": request}).data},
            message="Verification submitted",
            status_code=201,
        )


class VerificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in {"admin", "moderator"}:
            queryset = verification_queryset().filter(provider__user=request.user)
        else:
            queryset = verification_queryset()
        return success_response(
            data={"verifications": VerificationRequestSerializer(queryset, many=True, context={"request": request}).data},
            message="Verification requests",
        )


class ReviewVerificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, verification_id: int):
        serializer = ReviewVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        req = VerificationService.review_request(actor=request.user, verification_id=verification_id, **serializer.validated_data)
        return success_response(
            data={"verification": VerificationRequestSerializer(req, context={"request": request}).data},
            message="Verification reviewed",
        )


class RevokeVerificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, verification_id: int):
        req = VerificationService.revoke_request(actor=request.user, verification_id=verification_id)
        return success_response(
            data={"verification": VerificationRequestSerializer(req, context={"request": request}).data},
            message="Verification revoked",
        )


class RevokeProviderVerificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, provider_id: int):
        req = VerificationService.revoke_provider(actor=request.user, provider_id=provider_id)
        return success_response(
            data={"verification": VerificationRequestSerializer(req, context={"request": request}).data},
            message="Provider verification revoked",
        )


class VerificationFileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, verification_id: int, file_index: int):
        verification = verification_queryset().select_related("provider", "provider__user").filter(id=verification_id).first()
        if not verification:
            raise ResourceNotFound("Verification request not found.")

        if request.user.role not in {"admin", "moderator"} and verification.provider.user_id != request.user.id:
            raise PermissionDeniedDomain("Not allowed to access this verification file.")

        files = verification.files or []
        if file_index < 0 or file_index >= len(files):
            raise ResourceNotFound("Verification file not found.")

        file_meta = files[file_index]
        file_path = file_meta.get("path")
        if not file_path:
            raise ResourceNotFound("Verification file not found.")

        file_handle = default_storage.open(file_path, "rb")
        return FileResponse(
            file_handle,
            as_attachment=False,
            filename=Path(file_meta.get("name") or file_path).name,
            content_type=file_meta.get("type") or "application/octet-stream",
        )


urlpatterns = []
