from django.urls import path

from apps.bids.api.views import OrderBidCreateView
from .views import (
    MyOrdersView,
    OrderCancelView,
    OrderCompleteView,
    OrderDetailView,
    OrderListCreateView,
    OrderTransitionView,
)

urlpatterns = [
    path("", OrderListCreateView.as_view(), name="orders-list-create"),
    path("me/", MyOrdersView.as_view(), name="orders-me"),
    path("<int:order_id>/", OrderDetailView.as_view(), name="orders-detail"),
    path("<int:order_id>/transition/", OrderTransitionView.as_view(), name="orders-transition"),
    path("<int:order_id>/cancel/", OrderCancelView.as_view(), name="orders-cancel"),
    path("<int:order_id>/complete/", OrderCompleteView.as_view(), name="orders-complete"),
    path("<int:order_id>/bids/", OrderBidCreateView.as_view(), name="orders-bids-create"),
]
