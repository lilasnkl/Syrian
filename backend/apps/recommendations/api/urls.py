from django.urls import path

from .views import RecommendProvidersView

urlpatterns = [
    path("recommend-providers/", RecommendProvidersView.as_view(), name="recommend-providers"),
]
