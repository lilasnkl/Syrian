from django.test import TestCase

from apps.bids.services import BidService
from apps.orders.models import Order
from apps.providers.models import ProviderProfile
from apps.accounts.models import User


class BidWorkflowTests(TestCase):
    def setUp(self):
        self.customer = User.objects.create_user(email="customer@example.com", password="StrongPass123", role="customer")
        self.provider_user_1 = User.objects.create_user(email="provider1@example.com", password="StrongPass123", role="provider")
        self.provider_user_2 = User.objects.create_user(email="provider2@example.com", password="StrongPass123", role="provider")
        self.provider_1 = ProviderProfile.objects.create(user=self.provider_user_1, display_name="P1", category="plumbing")
        self.provider_2 = ProviderProfile.objects.create(user=self.provider_user_2, display_name="P2", category="plumbing")
        self.order = Order.objects.create(
            customer=self.customer,
            title="Pipe repair",
            description="Need urgent repair",
            category="plumbing",
            budget=100,
            location="Damascus",
            urgency="high",
        )

    def test_accept_bid_rejects_other_pending_bids_and_starts_order(self):
        bid_1 = BidService.create_bid(
            actor=self.provider_user_1,
            order=self.order,
            attrs={"amount": 90, "message": "Can do", "estimated_duration": "2h"},
        )
        bid_2 = BidService.create_bid(
            actor=self.provider_user_2,
            order=self.order,
            attrs={"amount": 85, "message": "Can do faster", "estimated_duration": "1.5h"},
        )

        BidService.accept_bid(actor=self.customer, bid=bid_1)

        bid_1.refresh_from_db()
        bid_2.refresh_from_db()
        self.order.refresh_from_db()

        self.assertEqual(bid_1.status, "accepted")
        self.assertEqual(bid_2.status, "rejected")
        self.assertEqual(self.order.status, "in_progress")
        self.assertEqual(self.order.awarded_provider_id, self.provider_1.id)

    def test_first_bid_keeps_order_open(self):
        BidService.create_bid(
            actor=self.provider_user_1,
            order=self.order,
            attrs={"amount": 90, "message": "Can do", "estimated_duration": "2h"},
        )

        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "open")

    def test_rejecting_last_pending_bid_cancels_order(self):
        bid = BidService.create_bid(
            actor=self.provider_user_1,
            order=self.order,
            attrs={"amount": 90, "message": "Can do", "estimated_duration": "2h"},
        )

        BidService.reject_bid(actor=self.customer, bid=bid)

        bid.refresh_from_db()
        self.order.refresh_from_db()
        self.assertEqual(bid.status, "rejected")
        self.assertEqual(self.order.status, "cancelled")
