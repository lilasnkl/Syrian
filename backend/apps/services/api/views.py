from rest_framework import permissions
from rest_framework.views import APIView

from apps.services.selectors import services_queryset
from apps.services.services import ServiceListingService
from shared.responses import success_response
from .serializers import ServiceCreateUpdateSerializer, ServiceSerializer


class ServiceListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        queryset = services_queryset().filter(is_active=True)
        category = request.query_params.get("category")
        provider_id = request.query_params.get("provider_id")

        if category:
            queryset = queryset.filter(category=category)
        if provider_id:
            queryset = queryset.filter(provider_id=provider_id)

        serializer = ServiceSerializer(queryset, many=True)
        return success_response(data={"services": serializer.data}, message="Services list")


class ServiceDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get(self, request, service_id: int):
        service = ServiceListingService.get_service_or_404(service_id)
        return success_response(data={"service": ServiceSerializer(service).data}, message="Service detail")

    def patch(self, request, service_id: int):
        service = ServiceListingService.get_service_or_404(service_id)
        serializer = ServiceCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = ServiceListingService.update_service(actor=request.user, service=service, attrs=serializer.validated_data)
        return success_response(data={"service": ServiceSerializer(updated).data}, message="Service updated")

    def delete(self, request, service_id: int):
        service = ServiceListingService.get_service_or_404(service_id)
        ServiceListingService.delete_service(actor=request.user, service=service)
        return success_response(data=None, message="Service deleted")


class MyServicesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = services_queryset().filter(provider__user=request.user)
        return success_response(data={"services": ServiceSerializer(queryset, many=True).data}, message="My services")

    def post(self, request):
        serializer = ServiceCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = ServiceListingService.create_service(actor=request.user, attrs=serializer.validated_data)
        return success_response(data={"service": ServiceSerializer(service).data}, message="Service created", status_code=201)


urlpatterns = []
