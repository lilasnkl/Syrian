from rest_framework import serializers

from apps.knowledge.models import KnowledgeIngestionJob, KnowledgeSource


class KnowledgeSourceSerializer(serializers.ModelSerializer):
    provider_id = serializers.IntegerField(source="provider.id", read_only=True)
    provider_name = serializers.CharField(source="provider.display_name", read_only=True)
    latest_job_status = serializers.SerializerMethodField()

    class Meta:
        model = KnowledgeSource
        fields = [
            "id",
            "provider_id",
            "provider_name",
            "source_type",
            "title",
            "description",
            "original_filename",
            "content_type",
            "file_size",
            "visibility",
            "status",
            "language",
            "source_version",
            "last_indexed_at",
            "error_code",
            "error_detail",
            "latest_job_status",
            "created_at",
            "updated_at",
        ]

    def get_latest_job_status(self, instance):
        job = instance.ingestion_jobs.order_by("-created_at").first()
        return job.status if job else ""


class KnowledgeSourceCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    visibility = serializers.ChoiceField(choices=[choice for choice, _label in KnowledgeSource.VISIBILITY_CHOICES])
    source_type = serializers.ChoiceField(
        required=False,
        choices=[KnowledgeSource.TYPE_UPLOADED_FILE, KnowledgeSource.TYPE_PROVIDER_EXPORT],
        default=KnowledgeSource.TYPE_UPLOADED_FILE,
    )
    file = serializers.FileField()
    process_now = serializers.BooleanField(required=False, default=False)


class KnowledgeIngestionJobSerializer(serializers.ModelSerializer):
    source_id = serializers.IntegerField(source="source.id", read_only=True)

    class Meta:
        model = KnowledgeIngestionJob
        fields = [
            "id",
            "source_id",
            "job_type",
            "status",
            "attempt_count",
            "started_at",
            "finished_at",
            "error_code",
            "error_detail",
            "created_at",
        ]

