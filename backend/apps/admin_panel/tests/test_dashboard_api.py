from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.bids.models import Bid
from apps.complaints.models import Complaint
from apps.orders.models import Order
from apps.providers.models import ProviderProfile


class AdminDashboardApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(email="admin-dashboard@example.com", password="StrongPass123", role="admin")
        self.customer = User.objects.create_user(email="customer-dashboard@example.com", password="StrongPass123", role="customer", first_name="Dana")
        self.provider_user = User.objects.create_user(email="provider-dashboard@example.com", password="StrongPass123", role="provider")
        self.provider = ProviderProfile.objects.create(
            user=self.provider_user,
            display_name="Dashboard Provider",
            category="cleaning",
        )
        self.order = Order.objects.create(
            customer=self.customer,
            title="Deep cleaning",
            description="Need apartment cleaned",
            category="cleaning",
            budget=100,
            location="Damascus",
            urgency="medium",
            status=Order.STATUS_OPEN,
        )
        Bid.objects.create(
            order=self.order,
            provider=self.provider,
            amount=75,
            message="Can do it",
            estimated_duration="2h",
            status=Bid.STATUS_ACCEPTED,
        )
        Complaint.objects.create(
            complainant=self.customer,
            against_provider=self.provider,
            subject="Late arrival",
            description="Provider arrived late",
            issue_type="other",
        )

    def test_admin_dashboard_returns_real_counts_and_recent_records(self):
        self.client.force_authenticate(self.admin)
        url = reverse("admin-dashboard")

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()["data"]["dashboard"]
        self.assertEqual(payload["stats"]["total_users"], 3)
        self.assertEqual(payload["stats"]["providers"], 1)
        self.assertEqual(payload["stats"]["requests"], 1)
        self.assertEqual(payload["stats"]["complaints"], 1)
        self.assertEqual(payload["stats"]["revenue"], 75.0)
        self.assertEqual(payload["recent_requests"][0]["title"], "Deep cleaning")
        self.assertEqual(payload["recent_bids"][0]["provider_name"], "Dashboard Provider")
        self.assertEqual(payload["recent_complaints"][0]["subject"], "Late arrival")

    def test_non_admin_cannot_access_admin_dashboard(self):
        self.client.force_authenticate(self.customer)
        url = reverse("admin-dashboard")

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
