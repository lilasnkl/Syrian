from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.notifications.models import Notification
from apps.chat.services import ChatService
from apps.providers.models import ProviderProfile


class ChatApiTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            email="chat-customer@example.com",
            password="StrongPass123",
            role="customer",
            first_name="Lina",
            last_name="Customer",
        )
        self.provider_user = User.objects.create_user(
            email="chat-provider@example.com",
            password="StrongPass123",
            role="provider",
            first_name="Provider",
            last_name="User",
        )
        self.provider_profile = ProviderProfile.objects.create(
            user=self.provider_user,
            display_name="Alaa Plumbing",
            category="plumbing",
        )

    def test_create_conversation_reuses_existing_thread_and_returns_participants(self):
        self.client.force_authenticate(self.customer)
        list_url = reverse("chat-conversations")

        first = self.client.post(list_url, {"participant_ids": [self.provider_user.id]}, format="json")
        second = self.client.post(list_url, {"participant_ids": [self.provider_user.id]}, format="json")

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)

        first_conversation = first.json()["data"]["conversation"]
        second_conversation = second.json()["data"]["conversation"]
        self.assertEqual(first_conversation["id"], second_conversation["id"])
        participant_names = {participant["name"] for participant in first_conversation["participants"]}
        self.assertIn("Lina Customer", participant_names)
        self.assertIn("Alaa Plumbing", participant_names)

    def test_participant_can_send_and_read_messages(self):
        conversation = ChatService.create_conversation(actor=self.customer, participant_ids=[self.provider_user.id])

        self.client.force_authenticate(self.customer)
        messages_url = reverse("chat-messages", kwargs={"conversation_id": conversation.id})
        send = self.client.post(messages_url, {"text": "Hello provider"}, format="json")
        self.assertEqual(send.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(self.provider_user)
        listing = self.client.get(messages_url)
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        messages = listing.json()["data"]["messages"]
        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0]["text"], "Hello provider")
        self.assertEqual(messages[0]["sender_id"], self.customer.id)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.provider_user,
                type=Notification.TYPE_MESSAGE,
                link=f"/chat?conversation={conversation.id}",
            ).exists()
        )
