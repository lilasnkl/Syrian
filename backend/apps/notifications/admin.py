from django.contrib import admin

from .models import Notification, NotificationDeliveryLog, NotificationPreference

admin.site.register(Notification)
admin.site.register(NotificationPreference)
admin.site.register(NotificationDeliveryLog)
