from rest_framework import permissions
from rest_framework.views import APIView

from apps.bids.selectors import bids_queryset
from apps.bids.services import BidService
from apps.orders.services import OrderService
from shared.responses import success_response
from .serializers import BidCreateUpdateSerializer, BidSerializer


class BidListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = bids_queryset()
        if request.user.role == "provider":
            queryset = queryset.filter(provider__user=request.user)
        elif request.user.role == "customer":
            queryset = queryset.filter(order__customer=request.user)

        return success_response(data={"bids": BidSerializer(queryset, many=True).data}, message="Bids list")


class OrderBidCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id: int):
        serializer = BidCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = OrderService.get_or_404(order_id)
        bid = BidService.create_bid(actor=request.user, order=order, attrs=serializer.validated_data)
        return success_response(data={"bid": BidSerializer(bid).data}, message="Bid created", status_code=201)


class BidDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, bid_id: int):
        bid = BidService.get_or_404(bid_id)
        BidService.assert_can_view(actor=request.user, bid=bid)
        return success_response(data={"bid": BidSerializer(bid).data}, message="Bid detail")

    def patch(self, request, bid_id: int):
        bid = BidService.get_or_404(bid_id)
        serializer = BidCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        bid = BidService.update_bid(actor=request.user, bid=bid, attrs=serializer.validated_data)
        return success_response(data={"bid": BidSerializer(bid).data}, message="Bid updated")


class BidAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, bid_id: int):
        bid = BidService.get_or_404(bid_id)
        bid = BidService.accept_bid(actor=request.user, bid=bid)
        return success_response(data={"bid": BidSerializer(bid).data}, message="Bid accepted")


class BidRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, bid_id: int):
        bid = BidService.get_or_404(bid_id)
        bid = BidService.reject_bid(actor=request.user, bid=bid)
        return success_response(data={"bid": BidSerializer(bid).data}, message="Bid rejected")


class BidWithdrawView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, bid_id: int):
        bid = BidService.get_or_404(bid_id)
        bid = BidService.withdraw_bid(actor=request.user, bid=bid)
        return success_response(data={"bid": BidSerializer(bid).data}, message="Bid withdrawn")


urlpatterns = []
