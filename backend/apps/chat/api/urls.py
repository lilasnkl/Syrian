from django.urls import path

from .views import ConversationListCreateView, ConversationMessagesView

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="chat-conversations"),
    path("conversations/<int:conversation_id>/messages/", ConversationMessagesView.as_view(), name="chat-messages"),
]
