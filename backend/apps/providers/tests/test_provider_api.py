from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.bids.models import Bid
from apps.notifications.models import Notification
from apps.providers.models import ProviderProfile, VerificationRequest
from apps.orders.models import Order


class ProviderApiTests(APITestCase):
    def setUp(self):
        self.provider_user = User.objects.create_user(
            email="provider-api@example.com",
            password="StrongPass123",
            role="provider",
        )
        self.customer_user = User.objects.create_user(
            email="customer-api@example.com",
            password="StrongPass123",
            role="customer",
        )
        self.admin_user = User.objects.create_user(
            email="admin-api@example.com",
            password="StrongPass123",
            role="admin",
        )

    def test_provider_can_read_and_update_own_profile(self):
        self.client.force_authenticate(self.provider_user)

        me_url = reverse("providers-me")
        response = self.client.get(me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.patch(
            me_url,
            {
                "display_name": "Updated Provider",
                "category": "plumbing",
                "hourly_rate": "45.00",
                "skills": ["Repair", "Diagnostics"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        profile = ProviderProfile.objects.get(user=self.provider_user)
        self.assertEqual(profile.display_name, "Updated Provider")
        self.assertEqual(profile.category, "plumbing")
        self.assertEqual(str(profile.hourly_rate), "45.00")

    def test_customer_cannot_update_provider_profile(self):
        self.client.force_authenticate(self.customer_user)

        me_url = reverse("providers-me")
        response = self.client.patch(
            me_url,
            {
                "display_name": "Not Allowed",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_blocked_provider_cannot_read_own_provider_profile(self):
        self.provider_user.status = "blocked"
        self.provider_user.blocked_reason = "Fraud review"
        self.provider_user.save(update_fields=["status", "blocked_reason", "updated_at"])
        self.client.force_authenticate(self.provider_user)

        me_url = reverse("providers-me")
        response = self.client.get(me_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_provider_list_filters_by_min_rating(self):
        ProviderProfile.objects.create(
            user=self.provider_user,
            display_name="High Rated Provider",
            category="plumbing",
            rating="4.80",
        )
        low_rated_user = User.objects.create_user(
            email="provider-low@example.com",
            password="StrongPass123",
            role="provider",
        )
        ProviderProfile.objects.create(
            user=low_rated_user,
            display_name="Low Rated Provider",
            category="plumbing",
            rating="3.90",
        )

        list_url = reverse("providers-list")
        response = self.client.get(list_url, {"min_rating": "4.5"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        provider_names = {provider["display_name"] for provider in response.json()["data"]["providers"]}
        self.assertIn("High Rated Provider", provider_names)
        self.assertNotIn("Low Rated Provider", provider_names)

    def test_verification_submission_prevents_duplicate_pending_and_admin_can_approve(self):
        self.client.force_authenticate(self.provider_user)
        submit_url = reverse("providers-submit-verification")

        response = self.client.post(
            submit_url,
            {
                "documents": ["id-front.png", "license.pdf"],
                "description": "Professional provider profile",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        duplicate = self.client.post(
            submit_url,
            {
                "documents": ["id-front.png"],
            },
            format="json",
        )
        self.assertEqual(duplicate.status_code, status.HTTP_409_CONFLICT)

        verification = VerificationRequest.objects.get(provider__user=self.provider_user)

        self.client.force_authenticate(self.admin_user)
        review_url = reverse("providers-verification-review", kwargs={"verification_id": verification.id})
        approve_response = self.client.post(review_url, {"approve": True}, format="json")

        self.assertEqual(approve_response.status_code, status.HTTP_200_OK)

        verification.refresh_from_db()
        profile = ProviderProfile.objects.get(user=self.provider_user)

        self.assertEqual(verification.status, "approved")
        self.assertTrue(profile.is_verified)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.admin_user,
                type=Notification.TYPE_VERIFICATION,
                title="New verification request",
                link="/admin/verification",
            ).exists()
        )

    def test_admin_can_review_verification_details_and_open_uploaded_file(self):
        self.client.force_authenticate(self.provider_user)
        submit_url = reverse("providers-submit-verification")

        response = self.client.post(
            submit_url,
            {
                "documents": ["license.pdf"],
                "description": "Professional provider profile",
                "years_experience": 8,
                "service_areas": ["Damascus", "Homs"],
                "files": [SimpleUploadedFile("evidence.pdf", b"verification-file", content_type="application/pdf")],
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(self.admin_user)
        list_url = reverse("providers-verification-list")
        list_response = self.client.get(list_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

        verification = list_response.json()["data"]["verifications"][0]
        self.assertEqual(verification["description"], "Professional provider profile")
        self.assertEqual(verification["years_experience"], 8)
        self.assertEqual(verification["service_areas"], ["Damascus", "Homs"])
        self.assertEqual(verification["files"][0]["name"], "evidence.pdf")

        file_response = self.client.get(verification["files"][0]["url"])
        self.assertEqual(file_response.status_code, status.HTTP_200_OK)

    def test_admin_can_revoke_verified_provider(self):
        profile = ProviderProfile.objects.create(
            user=self.provider_user,
            display_name="Verified Provider",
            category="plumbing",
            is_verified=True,
        )
        verification = VerificationRequest.objects.create(
            provider=profile,
            documents=["license.pdf"],
            description="Verified profile",
            status=VerificationRequest.STATUS_APPROVED,
            reviewed_by=self.admin_user,
        )

        self.client.force_authenticate(self.admin_user)
        revoke_url = reverse("providers-verification-revoke", kwargs={"verification_id": verification.id})
        response = self.client.post(revoke_url, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        verification.refresh_from_db()
        profile.refresh_from_db()
        self.assertEqual(verification.status, VerificationRequest.STATUS_REVOKED)
        self.assertFalse(profile.is_verified)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.provider_user,
                type=Notification.TYPE_SYSTEM,
                title="Verification revoked",
            ).exists()
        )

    def test_admin_can_revoke_verified_provider_from_provider_endpoint(self):
        profile = ProviderProfile.objects.create(
            user=self.provider_user,
            display_name="Verified Provider",
            category="plumbing",
            is_verified=True,
        )
        verification = VerificationRequest.objects.create(
            provider=profile,
            documents=["license.pdf"],
            description="Verified profile",
            status=VerificationRequest.STATUS_APPROVED,
            reviewed_by=self.admin_user,
        )

        self.client.force_authenticate(self.admin_user)
        revoke_url = reverse("providers-provider-verification-revoke", kwargs={"provider_id": profile.id})
        response = self.client.post(revoke_url, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        verification.refresh_from_db()
        profile.refresh_from_db()
        self.assertEqual(verification.status, VerificationRequest.STATUS_REVOKED)
        self.assertFalse(profile.is_verified)

    def test_provider_can_view_real_earnings_snapshot(self):
        profile = ProviderProfile.objects.create(
            user=self.provider_user,
            display_name="Earnings Provider",
            category="cleaning",
        )
        order = Order.objects.create(
            customer=self.customer_user,
            title="Move-out clean",
            description="Deep clean apartment",
            category="cleaning",
            budget=120,
            location="Damascus",
            urgency="medium",
        )
        Bid.objects.create(
            order=order,
            provider=profile,
            amount=90,
            message="Can do it",
            estimated_duration="3h",
            status=Bid.STATUS_ACCEPTED,
        )

        self.client.force_authenticate(self.provider_user)
        earnings_url = reverse("providers-me-earnings")
        response = self.client.get(earnings_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()["data"]["earnings"]
        self.assertEqual(payload["stats"]["total_earnings"], 90.0)
        self.assertEqual(payload["stats"]["this_month"], 90.0)
        self.assertEqual(payload["stats"]["avg_per_job"], 90.0)
        self.assertEqual(payload["transactions"][0]["job"], "Move-out clean")
