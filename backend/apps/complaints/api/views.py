from rest_framework import permissions
from rest_framework.views import APIView

from apps.complaints.models import Complaint
from apps.complaints.services import ComplaintService
from shared.responses import success_response
from .serializers import (
    ComplaintActionSerializer,
    ComplaintCreateSerializer,
    ComplaintRespondSerializer,
    ComplaintResponseSerializer,
    ComplaintSerializer,
)


class ComplaintListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = Complaint.objects.all().order_by("-created_at")
        if request.user.role not in {"admin", "moderator"}:
            queryset = queryset.filter(complainant=request.user)
        return success_response(data={"complaints": ComplaintSerializer(queryset, many=True).data}, message="Complaints list")

    def post(self, request):
        serializer = ComplaintCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        complaint = ComplaintService.create_complaint(actor=request.user, attrs=serializer.validated_data)
        return success_response(data={"complaint": ComplaintSerializer(complaint).data}, message="Complaint created", status_code=201)


class ComplaintDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, complaint_id: int):
        complaint = ComplaintService.get_or_404(complaint_id)
        if request.user.role not in {"admin", "moderator"} and complaint.complainant_id != request.user.id:
            return success_response(data=None, message="Not allowed", status_code=403)
        return success_response(data={"complaint": ComplaintSerializer(complaint).data}, message="Complaint detail")


class ComplaintRespondView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, complaint_id: int):
        serializer = ComplaintRespondSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        complaint = ComplaintService.get_or_404(complaint_id)
        response = ComplaintService.respond(actor=request.user, complaint=complaint, **serializer.validated_data)
        return success_response(data={"response": ComplaintResponseSerializer(response).data}, message="Complaint response added")


class ComplaintActionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, complaint_id: int):
        complaint = ComplaintService.get_or_404(complaint_id)
        if request.user.role not in {"admin", "moderator"} and complaint.complainant_id != request.user.id:
            return success_response(data=None, message="Not allowed", status_code=403)
        return success_response(data={"actions": ComplaintActionSerializer(complaint.actions.all(), many=True).data}, message="Complaint actions")


urlpatterns = []
