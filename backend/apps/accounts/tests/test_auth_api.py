from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User


class AccountsAuthApiTests(APITestCase):
    def test_register_login_and_me_flow(self):
        register_url = reverse("auth-register")
        response = self.client.post(
            register_url,
            {
                "email": "user@example.com",
                "password": "StrongPass123",
                "first_name": "U",
                "last_name": "S",
                "role": "customer",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="user@example.com").exists())

        login_url = reverse("auth-login")
        response = self.client.post(
            login_url,
            {"email": "user@example.com", "password": "StrongPass123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.cookies)
        self.assertIn("refresh_token", response.cookies)

        me_url = reverse("auth-me")
        me_response = self.client.get(me_url)
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.json()["data"]["user"]["email"], "user@example.com")

    def test_blocked_user_cannot_login(self):
        user = User.objects.create_user(
            email="blocked@example.com",
            password="StrongPass123",
            status="blocked",
            blocked_reason="Repeated abuse reports",
        )
        self.assertEqual(user.status, "blocked")

        login_url = reverse("auth-login")
        response = self.client.post(
            login_url,
            {"email": "blocked@example.com", "password": "StrongPass123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "account_blocked")
        self.assertEqual(payload["error"]["details"]["blocked_reason"], "Repeated abuse reports")

    def test_admin_can_block_user_with_reason(self):
        admin = User.objects.create_user(email="admin@example.com", password="StrongPass123", role="admin")
        target = User.objects.create_user(email="target@example.com", password="StrongPass123", role="customer")
        self.client.force_authenticate(admin)

        status_url = reverse("user-status", kwargs={"user_id": target.id})
        response = self.client.patch(
            status_url,
            {"status": "blocked", "blocked_reason": "Terms violation"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        target.refresh_from_db()
        self.assertEqual(target.status, "blocked")
        self.assertEqual(target.blocked_reason, "Terms violation")

    def test_non_admin_cannot_block_user(self):
        actor = User.objects.create_user(email="actor@example.com", password="StrongPass123", role="customer")
        target = User.objects.create_user(email="target2@example.com", password="StrongPass123", role="customer")
        self.client.force_authenticate(actor)

        status_url = reverse("user-status", kwargs={"user_id": target.id})
        response = self.client.patch(
            status_url,
            {"status": "blocked", "blocked_reason": "Not allowed"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_authenticated_user_can_change_password(self):
        user = User.objects.create_user(email="password@example.com", password="StrongPass123", role="customer")
        self.client.force_authenticate(user)

        change_url = reverse("auth-change-password")
        response = self.client.post(
            change_url,
            {"current_password": "StrongPass123", "new_password": "NewStrongPass456"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password("NewStrongPass456"))

    def test_change_password_rejects_invalid_current_password(self):
        user = User.objects.create_user(email="password2@example.com", password="StrongPass123", role="customer")
        self.client.force_authenticate(user)

        change_url = reverse("auth-change-password")
        response = self.client.post(
            change_url,
            {"current_password": "WrongPass123", "new_password": "NewStrongPass456"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "invalid_current_password")

    def test_change_password_rejects_same_password(self):
        user = User.objects.create_user(email="password3@example.com", password="StrongPass123", role="customer")
        self.client.force_authenticate(user)

        change_url = reverse("auth-change-password")
        response = self.client.post(
            change_url,
            {"current_password": "StrongPass123", "new_password": "StrongPass123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "password_unchanged")

    def test_cors_preflight_allowed_for_auth_endpoints(self):
        me_url = reverse("auth-me")
        response = self.client.options(
            me_url,
            HTTP_ORIGIN="http://localhost:8080",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type,x-csrftoken",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.headers.get("access-control-allow-origin"), "http://localhost:8080")
        self.assertEqual(response.headers.get("access-control-allow-credentials"), "true")
