from django.contrib import admin

from .models import Complaint, ComplaintActionLog, ComplaintResponse

admin.site.register(Complaint)
admin.site.register(ComplaintResponse)
admin.site.register(ComplaintActionLog)
