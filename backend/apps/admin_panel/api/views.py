from rest_framework import permissions
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admin_panel.selectors import get_dashboard_snapshot
from shared.exceptions import PermissionDeniedDomain
from shared.responses import success_response

@api_view(["GET"])
def health(_request):
    return Response({"module": "admin_panel", "status": "ok"})


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in {"admin", "moderator"}:
            raise PermissionDeniedDomain("Only admin or moderator can access dashboard data.")

        snapshot = get_dashboard_snapshot()
        return success_response(data={"dashboard": snapshot}, message="Admin dashboard")
