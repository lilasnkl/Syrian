from django.urls import path

from .views import (
    BidAcceptView,
    BidDetailView,
    BidListView,
    BidRejectView,
    BidWithdrawView,
    OrderBidCreateView,
)

urlpatterns = [
    path("", BidListView.as_view(), name="bids-list"),
    path("<int:bid_id>/", BidDetailView.as_view(), name="bids-detail"),
    path("<int:bid_id>/accept/", BidAcceptView.as_view(), name="bids-accept"),
    path("<int:bid_id>/reject/", BidRejectView.as_view(), name="bids-reject"),
    path("<int:bid_id>/withdraw/", BidWithdrawView.as_view(), name="bids-withdraw"),
    path("orders/<int:order_id>/", OrderBidCreateView.as_view(), name="orders-bids-create"),
]
