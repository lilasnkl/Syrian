from django.contrib import admin

from apps.knowledge.models import KnowledgeChunk, KnowledgeDocument, KnowledgeIngestionJob, KnowledgeSource


@admin.register(KnowledgeSource)
class KnowledgeSourceAdmin(admin.ModelAdmin):
    list_display = ("id", "provider", "title", "source_type", "visibility", "status", "last_indexed_at")
    list_filter = ("source_type", "visibility", "status")
    search_fields = ("title", "description", "original_filename", "provider__display_name")


@admin.register(KnowledgeDocument)
class KnowledgeDocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "source", "provider", "extraction_status", "token_count", "created_at")
    list_filter = ("extraction_status", "detected_language")
    search_fields = ("source__title", "provider__display_name")


@admin.register(KnowledgeChunk)
class KnowledgeChunkAdmin(admin.ModelAdmin):
    list_display = ("id", "source", "provider", "chunk_index", "embedding_model", "is_active")
    list_filter = ("is_active", "visibility", "embedding_model")
    search_fields = ("chunk_text", "source__title", "provider__display_name")


@admin.register(KnowledgeIngestionJob)
class KnowledgeIngestionJobAdmin(admin.ModelAdmin):
    list_display = ("id", "source", "job_type", "status", "attempt_count", "started_at", "finished_at")
    list_filter = ("job_type", "status")
    search_fields = ("source__title", "error_code", "error_detail")

