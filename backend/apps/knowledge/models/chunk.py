from django.db import models


class KnowledgeChunk(models.Model):
    document = models.ForeignKey("knowledge.KnowledgeDocument", on_delete=models.CASCADE, related_name="chunks")
    source = models.ForeignKey("knowledge.KnowledgeSource", on_delete=models.CASCADE, related_name="chunks")
    provider = models.ForeignKey("providers.ProviderProfile", on_delete=models.CASCADE, related_name="knowledge_chunks")
    chunk_index = models.PositiveIntegerField()
    chunk_text = models.TextField()
    chunk_hash = models.CharField(max_length=64, db_index=True)
    embedding = models.JSONField(default=list, blank=True)
    embedding_model = models.CharField(max_length=120, blank=True)
    token_count = models.PositiveIntegerField(default=0)
    language = models.CharField(max_length=12, blank=True)
    visibility = models.CharField(max_length=40)
    metadata = models.JSONField(default=dict, blank=True)
    page_number = models.PositiveIntegerField(null=True, blank=True)
    row_number = models.PositiveIntegerField(null=True, blank=True)
    section_title = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["source_id", "chunk_index"]
        unique_together = ("source", "chunk_index", "chunk_hash")
        indexes = [
            models.Index(fields=["provider", "visibility", "is_active"]),
            models.Index(fields=["source", "is_active"]),
            models.Index(fields=["chunk_hash"]),
        ]

    def __str__(self):
        return f"KnowledgeChunk<{self.id}:source={self.source_id}:idx={self.chunk_index}>"

