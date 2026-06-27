from apps.customer_assistant.models import AssistantCitation


class CitationService:
    @staticmethod
    def create_citations(*, turn, citations: list[dict], retrieved_chunks):
        chunk_by_id = {item.chunk.id: item for item in retrieved_chunks}
        created = []
        for rank, citation in enumerate(citations, start=1):
            retrieved = chunk_by_id.get(citation.get("chunk_id"))
            if not retrieved:
                continue
            chunk = retrieved.chunk
            created.append(
                AssistantCitation.objects.create(
                    turn=turn,
                    chunk=chunk,
                    source=chunk.source,
                    provider=chunk.provider,
                    quote=citation.get("quote", "")[:1000],
                    relevance_score=retrieved.score,
                    rank=rank,
                )
            )
        return created

