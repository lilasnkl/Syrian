from django.urls import path

from .views import ProviderReviewsView, ReviewListCreateView

urlpatterns = [
    path("", ReviewListCreateView.as_view(), name="reviews-list-create"),
    path("providers/<int:provider_id>/", ProviderReviewsView.as_view(), name="provider-reviews"),
]
