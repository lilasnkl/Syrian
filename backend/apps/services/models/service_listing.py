from django.db import models


class ServiceListing(models.Model):
    PRICE_FIXED = "fixed"
    PRICE_HOURLY = "hourly"
    PRICE_STARTING_AT = "starting_at"

    PRICE_TYPE_CHOICES = [
        (PRICE_FIXED, "Fixed"),
        (PRICE_HOURLY, "Hourly"),
        (PRICE_STARTING_AT, "Starting At"),
    ]

    provider = models.ForeignKey("providers.ProviderProfile", on_delete=models.CASCADE, related_name="services")
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=60)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    price_type = models.CharField(max_length=20, choices=PRICE_TYPE_CHOICES, default=PRICE_FIXED)
    duration = models.CharField(max_length=120, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"ServiceListing<{self.title}>"
