from django.test import TestCase

from apps.orders.models import Order
from apps.orders.services import OrderService
from apps.accounts.models import User
from shared.exceptions import InvalidStateTransition


class OrderWorkflowTests(TestCase):
    def setUp(self):
        self.customer = User.objects.create_user(email="ordercustomer@example.com", password="StrongPass123", role="customer")
        self.provider = User.objects.create_user(email="orderprovider@example.com", password="StrongPass123", role="provider")
        self.order = Order.objects.create(
            customer=self.customer,
            title="Electrical inspection",
            description="Need inspection",
            category="electrical",
            budget=200,
            location="Aleppo",
            urgency="medium",
        )

    def test_invalid_direct_transition_open_to_completed_raises(self):
        with self.assertRaises(InvalidStateTransition):
            OrderService.transition(actor=self.provider, order=self.order, to_status="completed")

    def test_customer_can_cancel_open_order(self):
        OrderService.transition(actor=self.customer, order=self.order, to_status="cancelled")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "cancelled")

    def test_customer_can_cancel_in_progress_order(self):
        self.order.status = Order.STATUS_IN_PROGRESS
        self.order.save(update_fields=["status", "updated_at"])

        OrderService.transition(actor=self.customer, order=self.order, to_status="cancelled")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "cancelled")
