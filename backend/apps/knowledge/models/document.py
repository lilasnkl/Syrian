from django.db import models


class KnowledgeDocument(models.Model):
    STATUS_PENDING = "pending"
    STATUS_EXTRACTED = "extracted"
    STATUS_FAILED = "failed"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_EXTRACTED, "Extracted"),
        (STATUS_FAILED, "Failed"),
    ]

    source = models.ForeignKey("knowledge.KnowledgeSource", on_delete=models.CASCADE, related_name="documents")
    provider = models.ForeignKey("providers.ProviderProfile", on_delete=models.CASCADE, related_name="knowledge_documents")
    extraction_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    raw_text = models.TextField(blank=True)
    raw_text_storage_path = models.CharField(max_length=500, blank=True)
    normalized_text_hash = models.CharField(max_length=64, blank=True, db_index=True)
    detected_language = models.CharField(max_length=12, blank=True)
    page_count = models.PositiveIntegerField(default=0)
    row_count = models.PositiveIntegerField(default=0)
    token_count = models.PositiveIntegerField(default=0)
    extractor_version = models.CharField(max_length=40, default="v1")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["source", "extraction_status"]),
            models.Index(fields=["provider", "extraction_status"]),
        ]

    def __str__(self):
        return f"KnowledgeDocument<{self.id}:source={self.source_id}>"

