from django.conf import settings
from django.contrib.auth import authenticate
from django.middleware.csrf import get_token
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.repositories import UserRepository
from apps.accounts.selectors import list_users
from apps.accounts.services import AuthService, UserService
from shared.exceptions import BusinessRuleViolation, ResourceNotFound
from shared.responses import success_response
from .serializers import ChangePasswordSerializer, LoginSerializer, RegisterSerializer, UpdateUserSerializer, UpdateUserStatusSerializer, UserSerializer


def _token_pair_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


def _set_auth_cookies(response, tokens):
    response.set_cookie(
        settings.JWT_COOKIE_ACCESS,
        tokens["access"],
        httponly=True,
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
        max_age=15 * 60,
    )
    response.set_cookie(
        settings.JWT_COOKIE_REFRESH,
        tokens["refresh"],
        httponly=True,
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
        max_age=7 * 24 * 60 * 60,
    )


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = AuthService.register_user(**serializer.validated_data)
        tokens = _token_pair_for_user(user)

        response = success_response(data={"user": UserSerializer(user).data}, message="Registered", status_code=status.HTTP_201_CREATED)
        _set_auth_cookies(response, tokens)
        response["X-CSRFToken"] = get_token(request)
        return response


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        user = authenticate(request, username=email, password=password)
        if not user:
            raise BusinessRuleViolation(detail="Invalid credentials.", code="invalid_credentials")
        if user.status != "active":
            raise BusinessRuleViolation(
                detail="Account is blocked.",
                code="account_blocked",
                details={"blocked_reason": user.blocked_reason or ""},
            )

        tokens = _token_pair_for_user(user)
        response = success_response(data={"user": UserSerializer(user).data}, message="Logged in")
        _set_auth_cookies(response, tokens)
        response["X-CSRFToken"] = get_token(request)
        return response


class RefreshView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        raw_refresh = request.COOKIES.get(settings.JWT_COOKIE_REFRESH)
        if not raw_refresh:
            raise BusinessRuleViolation(detail="Refresh token missing.", code="refresh_missing")

        refresh = RefreshToken(raw_refresh)
        user = UserRepository.get_by_id(refresh.payload.get("user_id"))
        if user and user.status != "active":
            raise BusinessRuleViolation(
                detail="Account is blocked.",
                code="account_blocked",
                details={"blocked_reason": user.blocked_reason or ""},
            )
        access = refresh.access_token
        response = success_response(data={"access": str(access)}, message="Token refreshed")
        response.set_cookie(
            settings.JWT_COOKIE_ACCESS,
            str(access),
            httponly=True,
            secure=settings.JWT_COOKIE_SECURE,
            samesite=settings.JWT_COOKIE_SAMESITE,
            max_age=15 * 60,
        )
        response["X-CSRFToken"] = get_token(request)
        return response


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        raw_refresh = request.COOKIES.get(settings.JWT_COOKIE_REFRESH)
        if raw_refresh:
            try:
                token = RefreshToken(raw_refresh)
                token.blacklist()
            except Exception:
                pass

        response = success_response(data=None, message="Logged out")
        response.delete_cookie(settings.JWT_COOKIE_ACCESS)
        response.delete_cookie(settings.JWT_COOKIE_REFRESH)
        return response


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return success_response(data={"user": UserSerializer(request.user).data}, message="User profile")

    def patch(self, request):
        serializer = UpdateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = UserService.update_profile(actor=request.user, user_id=request.user.id, attrs=serializer.validated_data)
        return success_response(data={"user": UserSerializer(user).data}, message="Profile updated")


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        UserService.change_password(actor=request.user, **serializer.validated_data)
        return success_response(data=None, message="Password changed")


class UserDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id: int):
        user = UserRepository.get_by_id(user_id)
        if not user:
            raise ResourceNotFound("User not found.")

        if request.user.id != user.id and request.user.role not in {"admin", "moderator"}:
            raise BusinessRuleViolation(detail="Not allowed.", code="not_allowed")

        return success_response(data={"user": UserSerializer(user).data}, message="User detail")


class UserStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, user_id: int):
        serializer = UpdateUserStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = UserService.update_status(actor=request.user, user_id=user_id, **serializer.validated_data)
        return success_response(data={"user": UserSerializer(user).data}, message="User status updated")


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def users_list(request):
    if request.user.role not in {"admin", "moderator"}:
        raise BusinessRuleViolation(detail="Not allowed.", code="not_allowed")
    users = list_users()
    return success_response(data={"users": UserSerializer(users, many=True).data}, message="Users list")
