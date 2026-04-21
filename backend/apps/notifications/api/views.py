from rest_framework import permissions
from rest_framework.views import APIView

from apps.notifications.models import Notification
from apps.notifications.services import NotificationService
from shared.exceptions import ResourceNotFound
from shared.responses import success_response
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = NotificationService.visible_queryset_for_user(user=request.user)
        return success_response(data={"notifications": NotificationSerializer(queryset, many=True).data}, message="Notifications list")


class NotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, notification_id: int):
        notification = Notification.objects.filter(id=notification_id).first()
        if not notification:
            raise ResourceNotFound("Notification not found.")
        if notification.recipient_id != request.user.id:
            return success_response(data=None, message="Not allowed", status_code=403)

        notification = NotificationService.mark_read(notification=notification, actor=request.user)
        return success_response(data={"notification": NotificationSerializer(notification).data}, message="Notification marked read")


class NotificationReadAllView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        NotificationService.mark_all_read(actor=request.user)
        return success_response(data=None, message="All notifications marked read")


urlpatterns = []
