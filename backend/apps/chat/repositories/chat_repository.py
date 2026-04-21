from django.db.models import Count, Prefetch, Q

from apps.chat.models import Conversation, Message


class ChatRepository:
    @staticmethod
    def list_conversations_for_user(user):
        return (
            Conversation.objects.filter(participants=user)
            .prefetch_related(
                "participants",
                "participants__provider_profile",
                "participants__profile",
                Prefetch("messages", queryset=Message.objects.order_by("created_at")),
                "read_states",
            )
            .order_by("-updated_at")
        )

    @staticmethod
    def get_conversation(conversation_id):
        return (
            Conversation.objects.prefetch_related(
                "participants",
                "participants__provider_profile",
                "participants__profile",
                Prefetch("messages", queryset=Message.objects.order_by("created_at")),
                "read_states",
            )
            .filter(id=conversation_id)
            .first()
        )

    @staticmethod
    def find_conversation_by_participants(*, participant_ids, order=None):
        participant_ids = set(participant_ids)
        if not participant_ids:
            return None

        return (
            Conversation.objects.filter(order=order)
            .annotate(
                participants_count=Count("participants", distinct=True),
                matched_participants_count=Count(
                    "participants",
                    filter=Q(participants__id__in=participant_ids),
                    distinct=True,
                ),
            )
            .filter(
                participants_count=len(participant_ids),
                matched_participants_count=len(participant_ids),
            )
            .prefetch_related(
                "participants",
                "participants__provider_profile",
                "participants__profile",
                Prefetch("messages", queryset=Message.objects.order_by("created_at")),
                "read_states",
            )
            .first()
        )
