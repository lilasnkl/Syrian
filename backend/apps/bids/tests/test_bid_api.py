from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.bids.models import Bid
from apps.notifications.models import Notification
from apps.orders.models import Order
from apps.providers.models import ProviderProfile
from apps.services.models import ServiceListing


class BidsApiTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            email="bids-customer@example.com",
            password="StrongPass123",
            role="customer",
        )
        self.provider_user = User.objects.create_user(
            email="bids-provider@example.com",
            password="StrongPass123",
            role="provider",
        )
        self.provider_user_2 = User.objects.create_user(
            email="bids-provider-2@example.com",
            password="StrongPass123",
            role="provider",
        )

        self.provider = ProviderProfile.objects.create(
            user=self.provider_user,
            display_name="Bid Provider One",
            category="plumbing",
        )
        self.provider_2 = ProviderProfile.objects.create(
            user=self.provider_user_2,
            display_name="Bid Provider Two",
            category="plumbing",
        )
        self.out_of_category_provider_user = User.objects.create_user(
            email="bids-provider-3@example.com",
            password="StrongPass123",
            role="provider",
        )
        self.out_of_category_provider = ProviderProfile.objects.create(
            user=self.out_of_category_provider_user,
            display_name="Bid Provider Three",
            category="electrical",
        )

        self.order = Order.objects.create(
            customer=self.customer,
            title="Fix sink",
            description="Kitchen sink leak",
            category="plumbing",
            budget=80,
            location="Aleppo",
            urgency="medium",
        )

    def _bid_create_url(self):
        return reverse("orders-bids-create", kwargs={"order_id": self.order.id})

    def test_duplicate_bid_for_same_provider_is_rejected(self):
        self.client.force_authenticate(self.provider_user)

        first = self.client.post(
            self._bid_create_url(),
            {
                "amount": "70.00",
                "message": "I can do this",
                "estimated_duration": "2h",
            },
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        duplicate = self.client.post(
            self._bid_create_url(),
            {
                "amount": "65.00",
                "message": "Second attempt",
                "estimated_duration": "2h",
            },
            format="json",
        )
        self.assertEqual(duplicate.status_code, status.HTTP_409_CONFLICT)

    def test_non_participant_provider_cannot_view_bid_detail(self):
        self.client.force_authenticate(self.provider_user)
        create = self.client.post(
            self._bid_create_url(),
            {
                "amount": "70.00",
                "message": "Bid detail test",
                "estimated_duration": "2h",
            },
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)

        bid_id = create.data["data"]["bid"]["id"]

        self.client.force_authenticate(self.provider_user_2)
        detail_url = reverse("bids-detail", kwargs={"bid_id": bid_id})
        detail_response = self.client.get(detail_url)
        self.assertEqual(detail_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_accepting_bid_rejects_others_and_marks_order_in_progress(self):
        self.client.force_authenticate(self.provider_user)
        first = self.client.post(
            self._bid_create_url(),
            {
                "amount": "70.00",
                "message": "First bid",
                "estimated_duration": "2h",
            },
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(self.provider_user_2)
        second = self.client.post(
            self._bid_create_url(),
            {
                "amount": "68.00",
                "message": "Second bid",
                "estimated_duration": "90m",
            },
            format="json",
        )
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)

        first_bid_id = first.data["data"]["bid"]["id"]
        second_bid_id = second.data["data"]["bid"]["id"]

        self.client.force_authenticate(self.customer)
        accept_url = reverse("bids-accept", kwargs={"bid_id": first_bid_id})
        accept_response = self.client.post(accept_url, format="json")
        self.assertEqual(accept_response.status_code, status.HTTP_200_OK)

        first_bid = Bid.objects.get(id=first_bid_id)
        second_bid = Bid.objects.get(id=second_bid_id)
        self.order.refresh_from_db()

        self.assertEqual(first_bid.status, "accepted")
        self.assertEqual(second_bid.status, "rejected")
        self.assertEqual(self.order.status, "in_progress")
        self.assertEqual(self.order.awarded_provider_id, self.provider.id)
        self.assertTrue(self.order.status_history.filter(to_status="in_progress").exists())
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.provider_user,
                type=Notification.TYPE_BID,
                title="Offer accepted",
            ).exists()
        )

    def test_creating_bid_creates_customer_notification(self):
        self.client.force_authenticate(self.provider_user)

        response = self.client.post(
            self._bid_create_url(),
            {
                "amount": "70.00",
                "message": "First offer",
                "estimated_duration": "2h",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.customer,
                type=Notification.TYPE_BID,
                title="New offer received",
            ).exists()
        )

    def test_creating_first_bid_keeps_order_open(self):
        self.client.force_authenticate(self.provider_user)

        response = self.client.post(
            self._bid_create_url(),
            {
                "amount": "70.00",
                "message": "First offer",
                "estimated_duration": "2h",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "open")

    def test_rejecting_last_offer_cancels_order(self):
        self.client.force_authenticate(self.provider_user)
        create = self.client.post(
            self._bid_create_url(),
            {
                "amount": "70.00",
                "message": "Only offer",
                "estimated_duration": "2h",
            },
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)

        bid_id = create.data["data"]["bid"]["id"]
        self.client.force_authenticate(self.customer)
        reject_url = reverse("bids-reject", kwargs={"bid_id": bid_id})
        reject_response = self.client.post(reject_url, format="json")

        self.assertEqual(reject_response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "cancelled")

    def test_out_of_category_provider_cannot_bid_on_open_market_request(self):
        self.client.force_authenticate(self.out_of_category_provider_user)

        response = self.client.post(
            self._bid_create_url(),
            {
                "amount": "75.00",
                "message": "Wrong category",
                "estimated_duration": "2h",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "provider_category_mismatch")

    def test_provider_cannot_bid_on_service_targeted_request_for_other_provider(self):
        targeted_service = ServiceListing.objects.create(
            provider=self.provider,
            title="Targeted plumbing service",
            description="Direct request target",
            category="plumbing",
            price=90,
            price_type=ServiceListing.PRICE_FIXED,
            duration="2h",
            is_active=True,
        )
        targeted_order = Order.objects.create(
            customer=self.customer,
            service=targeted_service,
            title="Request selected service",
            description="Only selected provider should bid",
            category="plumbing",
            budget=95,
            location="Aleppo",
            urgency="medium",
        )

        self.client.force_authenticate(self.provider_user_2)

        response = self.client.post(
            reverse("orders-bids-create", kwargs={"order_id": targeted_order.id}),
            {
                "amount": "88.00",
                "message": "Should not be allowed",
                "estimated_duration": "90m",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
