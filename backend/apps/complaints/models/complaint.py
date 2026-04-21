from django.db import models


class Complaint(models.Model):
    STATUS_OPEN = "open"
    STATUS_IN_REVIEW = "in_review"
    STATUS_RESOLVED = "resolved"
    STATUS_DISMISSED = "dismissed"
    STATUS_ESCALATED = "escalated"

    STATUS_CHOICES = [
        (STATUS_OPEN, "Open"),
        (STATUS_IN_REVIEW, "In Review"),
        (STATUS_RESOLVED, "Resolved"),
        (STATUS_DISMISSED, "Dismissed"),
        (STATUS_ESCALATED, "Escalated"),
    ]

    complainant = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="complaints")
    against_provider = models.ForeignKey(
        "providers.ProviderProfile",
        on_delete=models.SET_NULL,
        related_name="complaints",
        null=True,
        blank=True,
    )
    order = models.ForeignKey("orders.Order", on_delete=models.SET_NULL, related_name="complaints", null=True, blank=True)
    subject = models.CharField(max_length=255)
    description = models.TextField()
    issue_type = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ComplaintResponse(models.Model):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="responses")
    responder = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True)
    text = models.TextField()
    status_after = models.CharField(max_length=20, choices=Complaint.STATUS_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)


class ComplaintActionLog(models.Model):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="actions")
    actor = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True)
    action_type = models.CharField(max_length=100)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
