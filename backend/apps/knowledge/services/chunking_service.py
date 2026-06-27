import hashlib
from dataclasses import dataclass

from django.conf import settings

from apps.knowledge.models import KnowledgeChunk


@dataclass(frozen=True)
class ChunkCandidate:
    index: int
    text: str
    token_count: int
    metadata: dict


class ChunkingService:
    DEFAULT_CHUNK_TOKENS = 700
    DEFAULT_OVERLAP_TOKENS = 100

    @classmethod
    def create_chunks(cls, document) -> list[KnowledgeChunk]:
        candidates = cls.build_candidates(document.raw_text)
        chunks = []
        for candidate in candidates:
            chunk_hash = hashlib.sha256(candidate.text.encode("utf-8")).hexdigest()
            chunks.append(
                KnowledgeChunk.objects.create(
                    document=document,
                    source=document.source,
                    provider=document.provider,
                    chunk_index=candidate.index,
                    chunk_text=candidate.text,
                    chunk_hash=chunk_hash,
                    token_count=candidate.token_count,
                    language=document.detected_language,
                    visibility=document.source.visibility,
                    metadata=candidate.metadata,
                    page_number=candidate.metadata.get("page_number"),
                    row_number=candidate.metadata.get("row_number"),
                    section_title=candidate.metadata.get("section_title", ""),
                    is_active=False,
                )
            )
        return chunks

    @classmethod
    def build_candidates(cls, text: str) -> list[ChunkCandidate]:
        paragraphs = [paragraph.strip() for paragraph in (text or "").split("\n") if paragraph.strip()]
        sections = cls._paragraph_groups(paragraphs)
        max_tokens = int(getattr(settings, "RAG_CHUNK_TOKENS", cls.DEFAULT_CHUNK_TOKENS))
        overlap = int(getattr(settings, "RAG_CHUNK_OVERLAP_TOKENS", cls.DEFAULT_OVERLAP_TOKENS))
        candidates = []

        for section in sections:
            tokens = section.split()
            if not tokens:
                continue
            if len(tokens) <= max_tokens:
                candidates.append(section)
                continue

            step = max(max_tokens - overlap, 1)
            for start in range(0, len(tokens), step):
                window = tokens[start : start + max_tokens]
                if window:
                    candidates.append(" ".join(window))
                if start + max_tokens >= len(tokens):
                    break

        return [
            ChunkCandidate(index=index, text=chunk_text, token_count=len(chunk_text.split()), metadata=cls._metadata(chunk_text))
            for index, chunk_text in enumerate(candidates)
        ]

    @staticmethod
    def _paragraph_groups(paragraphs: list[str]) -> list[str]:
        groups = []
        current = []
        current_tokens = 0
        target_tokens = int(getattr(settings, "RAG_CHUNK_TOKENS", ChunkingService.DEFAULT_CHUNK_TOKENS))

        for paragraph in paragraphs:
            tokens = len(paragraph.split())
            if current and current_tokens + tokens > target_tokens:
                groups.append("\n".join(current))
                current = []
                current_tokens = 0
            current.append(paragraph)
            current_tokens += tokens

        if current:
            groups.append("\n".join(current))
        return groups

    @staticmethod
    def _metadata(text: str) -> dict:
        metadata = {}
        first_line = (text or "").splitlines()[0] if text else ""
        if first_line.lower().startswith("page "):
            try:
                metadata["page_number"] = int(first_line.split()[1])
            except (IndexError, ValueError):
                pass
        if first_line.lower().startswith("row "):
            try:
                metadata["row_number"] = int(first_line.split()[1].rstrip(":"))
            except (IndexError, ValueError):
                pass
        if first_line and len(first_line) <= 120:
            metadata["section_title"] = first_line
        return metadata

