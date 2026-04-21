from apps.orders.models import Order
from django.db.models import Q
from rest_framework import permissions
from rest_framework.views import APIView

from apps.orders.selectors import orders_queryset
from apps.orders.services import OrderService
from shared.responses import success_response
from .serializers import OrderCreateUpdateSerializer, OrderSerializer, OrderTransitionSerializer


class OrderListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = orders_queryset()
        if request.user.role == "customer":
            queryset = queryset.filter(customer=request.user)
        elif request.user.role == "provider":
            provider_profile = getattr(request.user, "provider_profile", None)
            if not provider_profile:
                queryset = queryset.none()
            else:
                queryset = queryset.filter(
                    Q(service__isnull=True, category=provider_profile.category, status=Order.STATUS_OPEN)
                    | Q(service__provider=provider_profile)
                    | Q(awarded_provider=provider_profile)
                    | Q(bids__provider=provider_profile)
                ).distinct()

        return success_response(data={"orders": OrderSerializer(queryset, many=True).data}, message="Orders list")

    def post(self, request):
        serializer = OrderCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = OrderService.create_order(actor=request.user, attrs=serializer.validated_data)
        return success_response(data={"order": OrderSerializer(order).data}, message="Order created", status_code=201)


class OrderDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_id: int):
        order = OrderService.get_or_404(order_id)
        OrderService.assert_can_view(actor=request.user, order=order)
        return success_response(data={"order": OrderSerializer(order).data}, message="Order detail")

    def patch(self, request, order_id: int):
        order = OrderService.get_or_404(order_id)
        serializer = OrderCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        order = OrderService.update_order(actor=request.user, order=order, attrs=serializer.validated_data)
        return success_response(data={"order": OrderSerializer(order).data}, message="Order updated")


class OrderTransitionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id: int):
        serializer = OrderTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = OrderService.get_or_404(order_id)
        order = OrderService.transition(
            actor=request.user,
            order=order,
            to_status=serializer.validated_data["status"],
            note=serializer.validated_data.get("note", ""),
        )
        return success_response(data={"order": OrderSerializer(order).data}, message="Order status updated")


class OrderCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id: int):
        order = OrderService.get_or_404(order_id)
        order = OrderService.transition(
            actor=request.user,
            order=order,
            to_status="cancelled",
            note=request.data.get("note", ""),
        )
        return success_response(data={"order": OrderSerializer(order).data}, message="Order cancelled")


class OrderCompleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id: int):
        order = OrderService.get_or_404(order_id)
        order = OrderService.transition(
            actor=request.user,
            order=order,
            to_status="completed",
            note=request.data.get("note", ""),
        )
        return success_response(data={"order": OrderSerializer(order).data}, message="Order completed")


class MyOrdersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = orders_queryset().filter(customer=request.user)
        return success_response(data={"orders": OrderSerializer(queryset, many=True).data}, message="My orders")


urlpatterns = []
