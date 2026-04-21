from django.db import models


class Review(models.Model):
    order = models.OneToOneField("orders.Order", on_delete=models.CASCADE, related_name="review")
    provider = models.ForeignKey("providers.ProviderProfile", on_delete=models.CASCADE, related_name="reviews")
    customer = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    is_flagged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class ReviewAggregate(models.Model):
    provider = models.OneToOneField("providers.ProviderProfile", on_delete=models.CASCADE, related_name="review_aggregate")
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    total_reviews = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)
