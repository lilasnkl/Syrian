from django.db import models


class Order(models.Model):
    STATUS_OPEN = "open"
    STATUS_AWARDED = "awarded"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    STATUS_DISPUTED = "disputed"

    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_AWARDED, "Awarded"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_DISPUTED, "Disputed"),
    ]

    customer = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="orders")
    service = models.ForeignKey("services.ServiceListing", on_delete=models.SET_NULL, related_name="orders", null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=60)
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    location = models.CharField(max_length=255)
    urgency = models.CharField(max_length=20, default="medium")
    preferred_time = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    awarded_provider = models.ForeignKey(
        "providers.ProviderProfile",
        on_delete=models.SET_NULL,
        related_name="awarded_orders",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order<{self.id}:{self.title}>"


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="status_history")
    from_status = models.CharField(max_length=20)
    to_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True)
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"OrderStatusHistory<{self.order_id}:{self.from_status}->{self.to_status}>"
