from django.db import models


class AssistantSession(models.Model):
    STATUS_ACTIVE = "active"
    STATUS_ARCHIVED = "archived"

    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_ARCHIVED, "Archived"),
    ]

    customer = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="assistant_sessions")
    provider = models.ForeignKey("providers.ProviderProfile", on_delete=models.CASCADE, related_name="assistant_sessions")
    order = models.ForeignKey("orders.Order", on_delete=models.SET_NULL, null=True, blank=True, related_name="assistant_sessions")
    service = models.ForeignKey("services.ServiceListing", on_delete=models.SET_NULL, null=True, blank=True, related_name="assistant_sessions")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["customer", "provider", "status"]),
            models.Index(fields=["provider", "status"]),
        ]

    def __str__(self):
        return f"AssistantSession<{self.id}:customer={self.customer_id}:provider={self.provider_id}>"

