from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.complaints.models import Complaint
from apps.notifications.models import Notification
from apps.providers.models import ProviderProfile


class ComplaintApiTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(email="complaint-user@example.com", password="StrongPass123", role="customer")
        self.provider_user = User.objects.create_user(email="complaint-provider@example.com", password="StrongPass123", role="provider")
        self.provider = ProviderProfile.objects.create(user=self.provider_user, display_name="Complaint Provider", category="cleaning")
        self.admin = User.objects.create_user(email="complaint-admin@example.com", password="StrongPass123", role="admin")

    def test_creating_complaint_notifies_admins(self):
        self.client.force_authenticate(self.customer)
        create_url = reverse("complaints-list-create")

        response = self.client.post(
            create_url,
            {
                "against_provider": self.provider.id,
                "subject": "Complaint title",
                "description": "Complaint description",
                "issue_type": "poor_quality",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Complaint.objects.filter(complainant=self.customer).exists())
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.admin,
                type=Notification.TYPE_COMPLAINT,
                title="New complaint received",
                link="/admin/complaints",
            ).exists()
        )
