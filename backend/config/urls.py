from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("apps.recommendations.api.urls")),
    path("api/v1/auth/", include("apps.accounts.api.urls")),
    path("api/v1/providers/", include("apps.providers.api.urls")),
    path("api/v1/services/", include("apps.services.api.urls")),
    path("api/v1/orders/", include("apps.orders.api.urls")),
    path("api/v1/bids/", include("apps.bids.api.urls")),
    path("api/v1/chat/", include("apps.chat.api.urls")),
    path("api/v1/complaints/", include("apps.complaints.api.urls")),
    path("api/v1/reviews/", include("apps.reviews.api.urls")),
    path("api/v1/notifications/", include("apps.notifications.api.urls")),
    path("api/v1/admin/", include("apps.admin_panel.api.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
