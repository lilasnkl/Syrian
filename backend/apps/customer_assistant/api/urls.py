from django.urls import path

from .views import AskQuestionView, AssistantSessionTurnsView

urlpatterns = [
    path("questions/", AskQuestionView.as_view(), name="customer-assistant-question"),
    path("sessions/<int:session_id>/turns/", AssistantSessionTurnsView.as_view(), name="customer-assistant-session-turns"),
]

