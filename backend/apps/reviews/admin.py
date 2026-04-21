from django.contrib import admin

from .models import Review, ReviewAggregate

admin.site.register(Review)
admin.site.register(ReviewAggregate)
