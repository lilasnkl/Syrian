from rest_framework import serializers

from apps.complaints.models import Complaint, ComplaintActionLog, ComplaintResponse


class ComplaintSerializer(serializers.ModelSerializer):
    complainant_id = serializers.IntegerField(source="complainant.id", read_only=True)

    class Meta:
        model = Complaint
        fields = [
            "id",
            "complainant_id",
            "against_provider",
            "order",
            "subject",
            "description",
            "issue_type",
            "status",
            "created_at",
            "updated_at",
        ]


class ComplaintCreateSerializer(serializers.Serializer):
    against_provider = serializers.IntegerField(required=False)
    order = serializers.IntegerField(required=False)
    subject = serializers.CharField(max_length=255)
    description = serializers.CharField()
    issue_type = serializers.CharField(required=False, allow_blank=True)


class ComplaintRespondSerializer(serializers.Serializer):
    text = serializers.CharField()
    status_after = serializers.ChoiceField(choices=["in_review", "resolved", "dismissed", "escalated"])


class ComplaintResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplaintResponse
        fields = ["id", "complaint", "responder", "text", "status_after", "created_at"]


class ComplaintActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplaintActionLog
        fields = ["id", "complaint", "actor", "action_type", "reason", "created_at"]
