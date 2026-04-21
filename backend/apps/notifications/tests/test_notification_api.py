from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService


class NotificationApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="notify@example.com", password="StrongPass123", role="customer")
        self.other_user = User.objects.create_user(email="notify-other@example.com", password="StrongPass123", role="customer")
        self.notification = NotificationService.create(
            recipient=self.user,
            type=Notification.TYPE_SYSTEM,
            title="Welcome",
            description="Notification body",
            link="/notifications",
        )

    def test_user_can_list_and_mark_notifications_read(self):
        self.client.force_authenticate(self.user)

        list_response = self.client.get(reverse("notifications-list"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.json()["data"]["notifications"]), 1)

        read_response = self.client.post(reverse("notifications-read", kwargs={"notification_id": self.notification.id}), format="json")
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)

        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)

    def test_user_can_mark_all_notifications_read(self):
        NotificationService.create(
            recipient=self.user,
            type=Notification.TYPE_BID,
            title="Bid update",
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(reverse("notifications-read-all"), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Notification.objects.filter(recipient=self.user, is_read=False).exists())

    def test_user_cannot_mark_other_user_notification_read(self):
        self.client.force_authenticate(self.other_user)

        response = self.client.post(reverse("notifications-read", kwargs={"notification_id": self.notification.id}), format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_only_sees_complaint_and_verification_notifications(self):
        admin = User.objects.create_user(email="notify-admin@example.com", password="StrongPass123", role="admin")
        NotificationService.create(recipient=admin, type=Notification.TYPE_SYSTEM, title="System")
        NotificationService.create(recipient=admin, type=Notification.TYPE_COMPLAINT, title="Complaint")
        NotificationService.create(recipient=admin, type=Notification.TYPE_VERIFICATION, title="Verification")

        self.client.force_authenticate(admin)
        response = self.client.get(reverse("notifications-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [notification["title"] for notification in response.json()["data"]["notifications"]]
        self.assertCountEqual(titles, ["Verification", "Complaint"])
