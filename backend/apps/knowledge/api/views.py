from rest_framework import permissions
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.views import APIView

from apps.knowledge.api.serializers import KnowledgeIngestionJobSerializer, KnowledgeSourceCreateSerializer, KnowledgeSourceSerializer
from apps.knowledge.selectors import knowledge_sources_queryset
from apps.knowledge.services import KnowledgeIngestionService, SourceLifecycleService, SourceSubmissionService
from shared.responses import success_response


class KnowledgeSourceListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        queryset = knowledge_sources_queryset()
        if request.user.role not in {"admin", "moderator"}:
            queryset = queryset.filter(provider__user=request.user)

        status_filter = request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return success_response(
            data={"sources": KnowledgeSourceSerializer(queryset, many=True).data},
            message="Knowledge sources",
        )

    def post(self, request):
        serializer = KnowledgeSourceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        source = SourceSubmissionService.submit_file(
            actor=request.user,
            title=serializer.validated_data["title"],
            description=serializer.validated_data.get("description", ""),
            visibility=serializer.validated_data["visibility"],
            source_type=serializer.validated_data.get("source_type"),
            uploaded_file=serializer.validated_data["file"],
        )

        if serializer.validated_data.get("process_now"):
            job = source.ingestion_jobs.order_by("-created_at").first()
            if job:
                KnowledgeIngestionService.process_job(job)
                source.refresh_from_db()

        return success_response(
            data={"source": KnowledgeSourceSerializer(source).data},
            message="Knowledge source submitted",
            status_code=201,
        )


class KnowledgeSourceArchiveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, source_id: int):
        source = SourceLifecycleService.archive(actor=request.user, source_id=source_id)
        return success_response(data={"source": KnowledgeSourceSerializer(source).data}, message="Knowledge source archived")


class KnowledgeSourceReindexView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, source_id: int):
        job = SourceLifecycleService.reindex(actor=request.user, source_id=source_id)
        return success_response(
            data={"job": KnowledgeIngestionJobSerializer(job).data},
            message="Knowledge source reindex queued",
            status_code=201,
        )

