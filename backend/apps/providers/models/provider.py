from django.db import models


class ProviderProfile(models.Model):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="provider_profile")
    display_name = models.CharField(max_length=255)
    bio = models.TextField(blank=True)
    category = models.CharField(max_length=60)
    location = models.CharField(max_length=255, blank=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    years_experience = models.PositiveIntegerField(default=0)
    is_verified = models.BooleanField(default=False)
    skills = models.JSONField(default=list, blank=True)
    availability = models.CharField(max_length=255, blank=True)
    response_time = models.CharField(max_length=120, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.PositiveIntegerField(default=0)
    completed_jobs = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"ProviderProfile<{self.user.email}>"


class VerificationRequest(models.Model):
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_REVOKED = "revoked"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_REVOKED, "Revoked"),
    ]

    provider = models.ForeignKey("providers.ProviderProfile", on_delete=models.CASCADE, related_name="verification_requests")
    documents = models.JSONField(default=list, blank=True)
    description = models.TextField(blank=True)
    files = models.JSONField(default=list, blank=True)
    years_experience = models.PositiveIntegerField(null=True, blank=True)
    service_areas = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    rejection_reason = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="reviewed_verifications",
        null=True,
        blank=True,
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"VerificationRequest<{self.provider_id}:{self.status}>"
