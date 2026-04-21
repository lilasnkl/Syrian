from django.urls import path

from .views import MyServicesView, ServiceDetailView, ServiceListView

urlpatterns = [
    path("", ServiceListView.as_view(), name="services-list"),
    path("<int:service_id>/", ServiceDetailView.as_view(), name="services-detail"),
    path("me/", MyServicesView.as_view(), name="services-me"),
]
