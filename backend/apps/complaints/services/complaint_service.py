from django.db import transaction

from apps.complaints.models import Complaint, ComplaintActionLog, ComplaintResponse
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService
from shared.exceptions import PermissionDeniedDomain, ResourceNotFound


class ComplaintService:
    @staticmethod
    def get_or_404(complaint_id: int):
        complaint = Complaint.objects.select_related("complainant", "against_provider", "order").filter(id=complaint_id).first()
        if not complaint:
            raise ResourceNotFound("Complaint not found.")
        return complaint

    @staticmethod
    @transaction.atomic
    def create_complaint(*, actor, attrs):
        normalized_attrs = dict(attrs)
        if "against_provider" in normalized_attrs:
            normalized_attrs["against_provider_id"] = normalized_attrs.pop("against_provider")
        if "order" in normalized_attrs:
            normalized_attrs["order_id"] = normalized_attrs.pop("order")

        complaint = Complaint.objects.create(complainant=actor, **normalized_attrs)
        ComplaintActionLog.objects.create(complaint=complaint, actor=actor, action_type="complaint_created")
        provider_name = complaint.against_provider.display_name if complaint.against_provider else "provider"
        NotificationService.create_for_admins(
            type=Notification.TYPE_COMPLAINT,
            title="New complaint received",
            description=f"{actor.email} submitted a complaint against {provider_name}.",
            link="/admin/complaints",
        )
        return complaint

    @staticmethod
    @transaction.atomic
    def respond(*, actor, complaint, text: str, status_after: str):
        if actor.role not in {"admin", "moderator"}:
            raise PermissionDeniedDomain("Only admin/moderator can respond to complaints.")

        complaint.status = status_after
        complaint.save(update_fields=["status", "updated_at"])

        response = ComplaintResponse.objects.create(
            complaint=complaint,
            responder=actor,
            text=text,
            status_after=status_after,
        )
        ComplaintActionLog.objects.create(
            complaint=complaint,
            actor=actor,
            action_type="complaint_status_changed",
            reason=text,
        )
        return response
