from django.db import models


class KnowledgeSource(models.Model):
    TYPE_UPLOADED_FILE = "uploaded_file"
    TYPE_PROVIDER_EXPORT = "provider_export"
    TYPE_PROFILE_SNAPSHOT = "profile_snapshot"
    TYPE_SERVICE_LISTING_SNAPSHOT = "service_listing_snapshot"
    TYPE_URL = "url"
    TYPE_MANUAL_TEXT = "manual_text"

    SOURCE_TYPE_CHOICES = [
        (TYPE_UPLOADED_FILE, "Uploaded file"),
        (TYPE_PROVIDER_EXPORT, "Provider export"),
        (TYPE_PROFILE_SNAPSHOT, "Profile snapshot"),
        (TYPE_SERVICE_LISTING_SNAPSHOT, "Service listing snapshot"),
        (TYPE_URL, "URL"),
        (TYPE_MANUAL_TEXT, "Manual text"),
    ]

    VISIBILITY_PUBLIC = "public_marketplace"
    VISIBILITY_AFTER_CONTACT = "customer_after_contact"
    VISIBILITY_AFTER_ORDER = "customer_after_order"
    VISIBILITY_PROVIDER_PRIVATE = "provider_private"
    VISIBILITY_ADMIN_ONLY = "admin_only"

    VISIBILITY_CHOICES = [
        (VISIBILITY_PUBLIC, "Public marketplace"),
        (VISIBILITY_AFTER_CONTACT, "Customer after contact"),
        (VISIBILITY_AFTER_ORDER, "Customer after order"),
        (VISIBILITY_PROVIDER_PRIVATE, "Provider private"),
        (VISIBILITY_ADMIN_ONLY, "Admin only"),
    ]

    STATUS_DRAFT = "draft"
    STATUS_PENDING = "pending_processing"
    STATUS_ACTIVE = "active"
    STATUS_ARCHIVED = "archived"
    STATUS_FAILED = "failed"
    STATUS_REJECTED = "rejected"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_PENDING, "Pending processing"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_ARCHIVED, "Archived"),
        (STATUS_FAILED, "Failed"),
        (STATUS_REJECTED, "Rejected"),
    ]

    provider = models.ForeignKey("providers.ProviderProfile", on_delete=models.CASCADE, related_name="knowledge_sources")
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="created_knowledge_sources")
    source_type = models.CharField(max_length=40, choices=SOURCE_TYPE_CHOICES, default=TYPE_UPLOADED_FILE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    original_filename = models.CharField(max_length=255, blank=True)
    content_type = models.CharField(max_length=120, blank=True)
    file_size = models.PositiveIntegerField(default=0)
    storage_path = models.CharField(max_length=500, blank=True)
    checksum_sha256 = models.CharField(max_length=64, blank=True, db_index=True)
    visibility = models.CharField(max_length=40, choices=VISIBILITY_CHOICES, default=VISIBILITY_PROVIDER_PRIVATE)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_PENDING)
    language = models.CharField(max_length=12, blank=True)
    source_version = models.PositiveIntegerField(default=1)
    last_indexed_at = models.DateTimeField(null=True, blank=True)
    error_code = models.CharField(max_length=80, blank=True)
    error_detail = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["provider", "visibility", "status"]),
            models.Index(fields=["checksum_sha256"]),
        ]

    def __str__(self):
        return f"KnowledgeSource<{self.id}:{self.title}>"

