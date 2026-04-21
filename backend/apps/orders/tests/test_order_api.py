from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.bids.services import BidService
from apps.notifications.models import Notification
from apps.orders.models import Order
from apps.orders.services import OrderService
from apps.providers.models import ProviderProfile
from apps.services.models import ServiceListing


class OrdersApiTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            email="orders-customer@example.com",
            password="StrongPass123",
            role="customer",
        )
        self.other_customer = User.objects.create_user(
            email="orders-customer-2@example.com",
            password="StrongPass123",
            role="customer",
        )
        self.provider_user = User.objects.create_user(
            email="orders-provider@example.com",
            password="StrongPass123",
            role="provider",
        )
        self.other_provider_user = User.objects.create_user(
            email="orders-provider-2@example.com",
            password="StrongPass123",
            role="provider",
        )

        self.provider_profile = ProviderProfile.objects.create(
            user=self.provider_user,
            display_name="Provider One",
            category="plumbing",
        )
        self.other_provider_profile = ProviderProfile.objects.create(
            user=self.other_provider_user,
            display_name="Provider Two",
            category="plumbing",
        )

        self.order = Order.objects.create(
            customer=self.customer,
            title="Pipe replacement",
            description="Need help with leaking pipe",
            category="plumbing",
            budget=120,
            location="Damascus",
            urgency="high",
        )

        self.service_listing = ServiceListing.objects.create(
            provider=self.provider_profile,
            title="Pipe repair",
            description="Service for leaking pipes",
            category="plumbing",
            price=75,
            price_type=ServiceListing.PRICE_FIXED,
            duration="2h",
            is_active=True,
        )

    def _accept_bid_for_primary_provider(self):
        bid = BidService.create_bid(
            actor=self.provider_user,
            order=self.order,
            attrs={"amount": 100, "message": "Can start today", "estimated_duration": "3h"},
        )
        BidService.accept_bid(actor=self.customer, bid=bid)
        self.order.refresh_from_db()

    def test_non_owner_customer_cannot_view_order_detail(self):
        self.client.force_authenticate(self.other_customer)
        detail_url = reverse("orders-detail", kwargs={"order_id": self.order.id})

        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_creating_first_offer_keeps_order_open(self):
        self.client.force_authenticate(self.provider_user)

        bid_create_url = reverse("orders-bids-create", kwargs={"order_id": self.order.id})
        response = self.client.post(
            bid_create_url,
            {
                "amount": "110.00",
                "message": "Can do this soon",
                "estimated_duration": "3h",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "open")

    def test_accepting_offer_marks_order_in_progress(self):
        self._accept_bid_for_primary_provider()
        self.assertEqual(self.order.status, "in_progress")
        self.assertEqual(self.order.awarded_provider_id, self.provider_profile.id)

    def test_accepted_provider_can_complete_in_progress_order(self):
        self._accept_bid_for_primary_provider()
        self.client.force_authenticate(self.provider_user)

        complete_url = reverse("orders-complete", kwargs={"order_id": self.order.id})
        response = self.client.post(complete_url, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "completed")

    def test_non_assigned_provider_cannot_complete_in_progress_order(self):
        self._accept_bid_for_primary_provider()
        self.client.force_authenticate(self.other_provider_user)

        complete_url = reverse("orders-complete", kwargs={"order_id": self.order.id})
        response = self.client.post(complete_url, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_rejecting_last_offer_marks_order_cancelled(self):
        bid = BidService.create_bid(
            actor=self.provider_user,
            order=self.order,
            attrs={"amount": 100, "message": "Can start today", "estimated_duration": "3h"},
        )

        self.client.force_authenticate(self.customer)
        reject_url = reverse("bids-reject", kwargs={"bid_id": bid.id})
        response = self.client.post(reject_url, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "cancelled")

    def test_customer_can_create_order_with_service_reference(self):
        self.client.force_authenticate(self.customer)
        list_url = reverse("orders-list-create")

        response = self.client.post(
            list_url,
            {
                "service": self.service_listing.id,
                "title": "Kitchen sink fix",
                "description": "Need a verified plumber for leaking sink",
                "category": "plumbing",
                "budget": "150.00",
                "location": "Damascus",
                "urgency": "medium",
                "preferred_time": "Tomorrow afternoon",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order_id = response.json()["data"]["order"]["id"]
        created = Order.objects.get(id=order_id)
        self.assertEqual(created.service_id, self.service_listing.id)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.provider_user,
                type=Notification.TYPE_ORDER,
                title="New service request",
                link="/provider/requests",
            ).exists()
        )

    def test_same_category_provider_cannot_view_service_targeted_order_for_other_provider(self):
        targeted_order = Order.objects.create(
            customer=self.customer,
            service=self.service_listing,
            title="Targeted plumbing help",
            description="Customer selected a specific provider service",
            category="plumbing",
            budget=140,
            location="Damascus",
            urgency="medium",
        )

        self.client.force_authenticate(self.other_provider_user)
        detail_url = reverse("orders-detail", kwargs={"order_id": targeted_order.id})

        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_provider_feed_excludes_service_targeted_order_for_other_provider(self):
        targeted_order = Order.objects.create(
            customer=self.customer,
            service=self.service_listing,
            title="Direct service request",
            description="Should only be visible to the selected provider",
            category="plumbing",
            budget=160,
            location="Damascus",
            urgency="medium",
        )

        self.client.force_authenticate(self.other_provider_user)
        list_url = reverse("orders-list-create")

        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        order_ids = {order["id"] for order in response.json()["data"]["orders"]}
        self.assertNotIn(targeted_order.id, order_ids)

    def test_service_reference_requires_matching_category(self):
        self.client.force_authenticate(self.customer)
        list_url = reverse("orders-list-create")

        response = self.client.post(
            list_url,
            {
                "service": self.service_listing.id,
                "title": "Wrong category request",
                "description": "Category should match the selected service",
                "category": "cleaning",
                "budget": "150.00",
                "location": "Damascus",
                "urgency": "medium",
                "preferred_time": "Tomorrow afternoon",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "service_category_mismatch")
        self.assertEqual(payload["error"]["details"]["service_category"], self.service_listing.category)
        self.assertEqual(payload["error"]["details"]["request_category"], "cleaning")

    def test_invalid_service_reference_returns_validation_error(self):
        self.client.force_authenticate(self.customer)
        list_url = reverse("orders-list-create")

        response = self.client.post(
            list_url,
            {
                "service": 999999,
                "title": "Invalid service order",
                "description": "Should fail validation",
                "category": "plumbing",
                "budget": "100.00",
                "location": "Damascus",
                "urgency": "low",
                "preferred_time": "Next week",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        payload = response.json()
        self.assertFalse(payload["success"])
        self.assertEqual(payload["error"]["type"], "validation_error")
