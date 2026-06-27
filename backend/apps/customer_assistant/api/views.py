from rest_framework import permissions
from rest_framework.views import APIView

from apps.customer_assistant.api.serializers import AskQuestionRequestSerializer, AssistantTurnSerializer
from apps.customer_assistant.models import AssistantSession
from apps.customer_assistant.repositories import AssistantRepository
from apps.customer_assistant.services import AssistantQuestionService
from shared.exceptions import PermissionDeniedDomain, ResourceNotFound
from shared.responses import success_response


class AskQuestionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AskQuestionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        turn = AssistantQuestionService.ask(actor=request.user, **serializer.validated_data)
        return success_response(data={"turn": AssistantTurnSerializer(turn).data}, message="Assistant answer", status_code=201)


class AssistantSessionTurnsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id: int):
        session = AssistantRepository.get_session(session_id)
        if not session:
            raise ResourceNotFound("Assistant session not found.")
        if not self._can_view(request.user, session):
            raise PermissionDeniedDomain("Not allowed to view this assistant session.")
        return success_response(
            data={"turns": AssistantTurnSerializer(session.turns.prefetch_related("citations", "citations__source", "citations__chunk"), many=True).data},
            message="Assistant turns",
        )

    @staticmethod
    def _can_view(user, session: AssistantSession) -> bool:
        if user.role in {"admin", "moderator"}:
            return True
        if session.customer_id == user.id:
            return True
        if session.provider.user_id == user.id:
            return True
        return False

