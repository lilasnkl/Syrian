from django.urls import path

from .views import ComplaintActionsView, ComplaintDetailView, ComplaintListCreateView, ComplaintRespondView

urlpatterns = [
    path("", ComplaintListCreateView.as_view(), name="complaints-list-create"),
    path("<int:complaint_id>/", ComplaintDetailView.as_view(), name="complaints-detail"),
    path("<int:complaint_id>/respond/", ComplaintRespondView.as_view(), name="complaints-respond"),
    path("<int:complaint_id>/actions/", ComplaintActionsView.as_view(), name="complaints-actions"),
]
