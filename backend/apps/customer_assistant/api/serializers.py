from rest_framework import serializers

from apps.customer_assistant.models import AssistantCitation, AssistantSession, AssistantTurn


class AskQuestionRequestSerializer(serializers.Serializer):
    provider_id = serializers.IntegerField()
    service_id = serializers.IntegerField(required=False, allow_null=True)
    order_id = serializers.IntegerField(required=False, allow_null=True)
    session_id = serializers.IntegerField(required=False, allow_null=True)
    question = serializers.CharField(min_length=2, max_length=2000, trim_whitespace=True)


class AssistantCitationSerializer(serializers.ModelSerializer):
    source_id = serializers.IntegerField(source="source.id", read_only=True)
    source_title = serializers.CharField(source="source.title", read_only=True, allow_blank=True)
    chunk_id = serializers.IntegerField(source="chunk.id", read_only=True)
    page_number = serializers.IntegerField(source="chunk.page_number", read_only=True, allow_null=True)
    row_number = serializers.IntegerField(source="chunk.row_number", read_only=True, allow_null=True)

    class Meta:
        model = AssistantCitation
        fields = [
            "id",
            "source_id",
            "source_title",
            "chunk_id",
            "quote",
            "relevance_score",
            "rank",
            "page_number",
            "row_number",
        ]


class AssistantTurnSerializer(serializers.ModelSerializer):
    session_id = serializers.IntegerField(source="session.id", read_only=True)
    citations = AssistantCitationSerializer(many=True, read_only=True)

    class Meta:
        model = AssistantTurn
        fields = [
            "id",
            "session_id",
            "question",
            "answer",
            "answer_status",
            "customer_next_step",
            "model",
            "embedding_model",
            "prompt_version",
            "input_tokens",
            "output_tokens",
            "cached_input_tokens",
            "answer_cache_hit",
            "citations",
            "created_at",
        ]


class AssistantSessionSerializer(serializers.ModelSerializer):
    provider_id = serializers.IntegerField(source="provider.id", read_only=True)
    provider_name = serializers.CharField(source="provider.display_name", read_only=True)

    class Meta:
        model = AssistantSession
        fields = ["id", "provider_id", "provider_name", "order", "service", "status", "created_at", "updated_at"]
