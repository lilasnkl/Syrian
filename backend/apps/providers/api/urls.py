from django.urls import path

from .views import (
    MyProviderEarningsView,
    MyProviderProfileView,
    ProviderDetailView,
    ProviderListView,
    RevokeProviderVerificationView,
    RevokeVerificationView,
    ReviewVerificationView,
    SubmitVerificationView,
    VerificationFileView,
    VerificationListView,
)

urlpatterns = [
    path("", ProviderListView.as_view(), name="providers-list"),
    path("<int:provider_id>/", ProviderDetailView.as_view(), name="providers-detail"),
    path("me/", MyProviderProfileView.as_view(), name="providers-me"),
    path("me/earnings/", MyProviderEarningsView.as_view(), name="providers-me-earnings"),
    path("me/verification/", SubmitVerificationView.as_view(), name="providers-submit-verification"),
    path("verification/", VerificationListView.as_view(), name="providers-verification-list"),
    path("verification/<int:verification_id>/files/<int:file_index>/", VerificationFileView.as_view(), name="providers-verification-file"),
    path("verification/<int:verification_id>/review/", ReviewVerificationView.as_view(), name="providers-verification-review"),
    path("verification/<int:verification_id>/revoke/", RevokeVerificationView.as_view(), name="providers-verification-revoke"),
    path("<int:provider_id>/verification/revoke/", RevokeProviderVerificationView.as_view(), name="providers-provider-verification-revoke"),
]
