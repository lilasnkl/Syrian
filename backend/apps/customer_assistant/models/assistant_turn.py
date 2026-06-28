from django.db import models


class AssistantTurn(models.Model):
    STATUS_ANSWERED = "answered"
    STATUS_INSUFFICIENT = "insufficient_evidence"
    STATUS_BLOCKED = "blocked_by_policy"
    STATUS_ERROR = "error"

    ANSWER_STATUS_CHOICES = [
        (STATUS_ANSWERED, "Answered"),
        (STATUS_INSUFFICIENT, "Insufficient evidence"),
        (STATUS_BLOCKED, "Blocked by policy"),
        (STATUS_ERROR, "Error"),
    ]

    session = models.ForeignKey("customer_assistant.AssistantSession", on_delete=models.CASCADE, related_name="turns")
    customer = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="assistant_turns")
    provider = models.ForeignKey("providers.ProviderProfile", on_delete=models.CASCADE, related_name="assistant_turns")
    question = models.TextField()
    normalized_question = models.TextField()
    answer = models.TextField(blank=True)
    answer_status = models.CharField(max_length=30, choices=ANSWER_STATUS_CHOICES)
    customer_next_step = models.CharField(max_length=255, blank=True)
    model = models.CharField(max_length=120, blank=True)
    embedding_model = models.CharField(max_length=120, blank=True)
    prompt_version = models.CharField(max_length=40, default="customer-rag-v1")
    input_tokens = models.PositiveIntegerField(default=0)
    output_tokens = models.PositiveIntegerField(default=0)
    cached_input_tokens = models.PositiveIntegerField(default=0)
    answer_cache_hit = models.BooleanField(default=False)
    latency_ms = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["session", "created_at"]),
            models.Index(fields=["customer", "created_at"]),
            models.Index(fields=["provider", "answer_status"]),
        ]

    def __str__(self):
        return f"AssistantTurn<{self.id}:{self.answer_status}>"
