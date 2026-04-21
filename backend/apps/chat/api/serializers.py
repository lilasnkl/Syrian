from rest_framework import serializers

from apps.chat.models import Conversation, Message


class ParticipantSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    role = serializers.CharField()
    name = serializers.CharField()
    avatar_url = serializers.CharField(allow_blank=True)


class ConversationSerializer(serializers.ModelSerializer):
    participant_ids = serializers.ListField(read_only=True)
    participants = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    last_message_at = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "order",
            "created_at",
            "updated_at",
            "participant_ids",
            "participants",
            "last_message",
            "last_message_at",
            "unread_count",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["participant_ids"] = list(instance.participants.values_list("id", flat=True))
        return data

    def get_participants(self, instance):
        participants = []
        for participant in instance.participants.all():
            full_name = f"{participant.first_name} {participant.last_name}".strip()
            provider_profile = getattr(participant, "provider_profile", None)
            avatar_url = getattr(getattr(participant, "profile", None), "avatar_url", "")
            participants.append(
                {
                    "id": participant.id,
                    "role": participant.role,
                    "name": provider_profile.display_name if provider_profile and provider_profile.display_name else (full_name or participant.email),
                    "avatar_url": avatar_url,
                }
            )
        return ParticipantSerializer(participants, many=True).data

    def get_last_message(self, instance):
        messages = list(instance.messages.all())
        last_message = messages[-1] if messages else None
        return last_message.text if last_message else ""

    def get_last_message_at(self, instance):
        messages = list(instance.messages.all())
        last_message = messages[-1] if messages else None
        return last_message.created_at if last_message else instance.updated_at

    def get_unread_count(self, instance):
        request = self.context.get("request")
        if not request or not getattr(request, "user", None) or not request.user.is_authenticated:
            return 0

        read_state = next((state for state in instance.read_states.all() if state.user_id == request.user.id), None)
        last_read_at = read_state.last_read_at if read_state else None
        return sum(
            1
            for message in instance.messages.all()
            if message.sender_id != request.user.id and (last_read_at is None or message.created_at > last_read_at)
        )


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source="sender.id", read_only=True)

    class Meta:
        model = Message
        fields = ["id", "conversation", "sender_id", "text", "created_at"]


class CreateConversationSerializer(serializers.Serializer):
    participant_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
    order_id = serializers.IntegerField(required=False)


class SendMessageSerializer(serializers.Serializer):
    text = serializers.CharField(min_length=1, max_length=4000)
