from django.urls import path

from .views import KnowledgeSourceArchiveView, KnowledgeSourceListCreateView, KnowledgeSourceReindexView

urlpatterns = [
    path("sources/", KnowledgeSourceListCreateView.as_view(), name="knowledge-sources"),
    path("sources/<int:source_id>/archive/", KnowledgeSourceArchiveView.as_view(), name="knowledge-source-archive"),
    path("sources/<int:source_id>/reindex/", KnowledgeSourceReindexView.as_view(), name="knowledge-source-reindex"),
]

