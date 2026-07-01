from django.db import models


class KnowledgeIngestionJob(models.Model):
    TYPE_FULL = "full_ingestion"
    TYPE_EXTRACT = "extract"
    TYPE_CHUNK = "chunk"
    TYPE_EMBED = "embed"
    TYPE_REINDEX = "reindex"

    JOB_TYPE_CHOICES = [
        (TYPE_FULL, "Full ingestion"),
        (TYPE_EXTRACT, "Extract"),
        (TYPE_CHUNK, "Chunk"),
        (TYPE_EMBED, "Embed"),
        (TYPE_REINDEX, "Reindex"),
    ]

    STATUS_QUEUED = "queued"
    STATUS_RUNNING = "running"
    STATUS_SUCCEEDED = "succeeded"
    STATUS_FAILED = "failed"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_QUEUED, "Queued"),
        (STATUS_RUNNING, "Running"),
        (STATUS_SUCCEEDED, "Succeeded"),
        (STATUS_FAILED, "Failed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    source = models.ForeignKey("knowledge.KnowledgeSource", on_delete=models.CASCADE, related_name="ingestion_jobs")
    job_type = models.CharField(max_length=30, choices=JOB_TYPE_CHOICES, default=TYPE_FULL)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_QUEUED)
    attempt_count = models.PositiveIntegerField(default=0)
    locked_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    error_code = models.CharField(max_length=80, blank=True)
    error_detail = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["status", "job_type", "created_at"]),
            models.Index(fields=["source", "status"]),
        ]

    def __str__(self):
        return f"KnowledgeIngestionJob<{self.id}:{self.job_type}:{self.status}>"

