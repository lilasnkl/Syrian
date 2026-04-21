from django.db import models


class Notification(models.Model):
    TYPE_BID = "bid"
    TYPE_ORDER = "order"
    TYPE_MESSAGE = "message"
    TYPE_REVIEW = "review"
    TYPE_COMPLAINT = "complaint"
    TYPE_VERIFICATION = "verification"
    TYPE_SYSTEM = "system"

    TYPE_CHOICES = [
        (TYPE_BID, "Bid"),
        (TYPE_ORDER, "Order"),
        (TYPE_MESSAGE, "Message"),
        (TYPE_REVIEW, "Review"),
        (TYPE_COMPLAINT, "Complaint"),
        (TYPE_VERIFICATION, "Verification"),
        (TYPE_SYSTEM, "System"),
    ]

    recipient = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=30, choices=TYPE_CHOICES, default=TYPE_SYSTEM)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    link = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class NotificationPreference(models.Model):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="notification_preferences")
    email_enabled = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=True)
    in_app_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)


class NotificationDeliveryLog(models.Model):
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, related_name="delivery_logs")
    channel = models.CharField(max_length=30)
    status = models.CharField(max_length=30)
    created_at = models.DateTimeField(auto_now_add=True)
