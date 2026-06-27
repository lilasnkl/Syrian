from django.db import models


class AssistantCitation(models.Model):
    turn = models.ForeignKey("customer_assistant.AssistantTurn", on_delete=models.CASCADE, related_name="citations")
    chunk = models.ForeignKey("knowledge.KnowledgeChunk", on_delete=models.SET_NULL, null=True, blank=True, related_name="assistant_citations")
    source = models.ForeignKey("knowledge.KnowledgeSource", on_delete=models.SET_NULL, null=True, blank=True, related_name="assistant_citations")
    provider = models.ForeignKey("providers.ProviderProfile", on_delete=models.CASCADE, related_name="assistant_citations")
    quote = models.TextField()
    relevance_score = models.FloatField(default=0)
    rank = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["rank", "id"]
        indexes = [
            models.Index(fields=["turn", "rank"]),
            models.Index(fields=["provider", "created_at"]),
        ]

    def __str__(self):
        return f"AssistantCitation<{self.id}:turn={self.turn_id}:rank={self.rank}>"

