from django.utils.dateparse import parse_datetime
from rest_framework import permissions
from rest_framework.views import APIView

from apps.chat.models import Message
from apps.chat.repositories import ChatRepository
from apps.chat.services import ChatService
from apps.orders.services import OrderService
from shared.responses import success_response
from .serializers import (
    ConversationSerializer,
    CreateConversationSerializer,
    MessageSerializer,
    SendMessageSerializer,
)


class ConversationListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = ChatRepository.list_conversations_for_user(request.user)
        return success_response(
            data={"conversations": ConversationSerializer(queryset, many=True, context={"request": request}).data},
            message="Conversations list",
        )

    def post(self, request):
        serializer = CreateConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = None
        if serializer.validated_data.get("order_id"):
            order = OrderService.get_or_404(serializer.validated_data["order_id"])
        convo = ChatService.create_conversation(
            actor=request.user,
            participant_ids=serializer.validated_data["participant_ids"],
            order=order,
        )
        return success_response(
            data={"conversation": ConversationSerializer(convo, context={"request": request}).data},
            message="Conversation created",
            status_code=201,
        )


class ConversationMessagesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, conversation_id: int):
        convo = ChatService.get_participant_conversation(actor=request.user, conversation_id=conversation_id)
        ChatService.mark_read(actor=request.user, conversation=convo)
        since = request.query_params.get("since")
        queryset = Message.objects.filter(conversation=convo)
        if since:
            since_dt = parse_datetime(since)
            if since_dt:
                queryset = queryset.filter(created_at__gt=since_dt)
        return success_response(data={"messages": MessageSerializer(queryset, many=True).data}, message="Messages list")

    def post(self, request, conversation_id: int):
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        convo = ChatService.get_participant_conversation(actor=request.user, conversation_id=conversation_id)
        msg = ChatService.send_message(actor=request.user, conversation=convo, text=serializer.validated_data["text"])
        return success_response(data={"message": MessageSerializer(msg).data}, message="Message sent", status_code=201)


urlpatterns = []
