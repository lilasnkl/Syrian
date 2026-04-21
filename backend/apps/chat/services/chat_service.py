from django.db import transaction
from django.utils import timezone

from apps.chat.models import Conversation, Message, ParticipantReadState
from apps.chat.repositories import ChatRepository
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService
from shared.exceptions import BusinessRuleViolation, PermissionDeniedDomain, ResourceNotFound


class ChatService:
    @staticmethod
    @transaction.atomic
    def create_conversation(*, actor, participant_ids, order=None):
        participant_ids = set(participant_ids) | {actor.id}
        if len(participant_ids) < 2:
            raise BusinessRuleViolation("Conversation must include at least two participants.", code="conversation_requires_participant")

        existing = ChatRepository.find_conversation_by_participants(participant_ids=participant_ids, order=order)
        if existing:
            return existing

        convo = Conversation.objects.create(order=order)
        for user_id in participant_ids:
            ParticipantReadState.objects.create(conversation=convo, user_id=user_id)
        convo.updated_at = timezone.now()
        convo.save(update_fields=["updated_at"])
        return convo

    @staticmethod
    def get_participant_conversation(*, actor, conversation_id: int):
        convo = ChatRepository.get_conversation(conversation_id)
        if not convo:
            raise ResourceNotFound("Conversation not found.")
        if not convo.participants.filter(id=actor.id).exists():
            raise PermissionDeniedDomain("You are not a participant in this conversation.")
        return convo

    @staticmethod
    @transaction.atomic
    def send_message(*, actor, conversation, text: str):
        if not conversation.participants.filter(id=actor.id).exists():
            raise PermissionDeniedDomain("You are not a participant in this conversation.")

        msg = Message.objects.create(conversation=conversation, sender=actor, text=text)
        conversation.updated_at = timezone.now()
        conversation.save(update_fields=["updated_at"])
        ParticipantReadState.objects.filter(conversation=conversation, user=actor).update(last_read_at=timezone.now())

        for participant in conversation.participants.exclude(id=actor.id):
            NotificationService.create(
                recipient=participant,
                type=Notification.TYPE_MESSAGE,
                title="New message",
                description=text[:120],
                link=f"/chat?conversation={conversation.id}",
            )
        return msg

    @staticmethod
    def mark_read(*, actor, conversation):
        if not conversation.participants.filter(id=actor.id).exists():
            raise PermissionDeniedDomain("You are not a participant in this conversation.")

        ParticipantReadState.objects.filter(conversation=conversation, user=actor).update(last_read_at=timezone.now())
