from django.conf import settings


class EvidenceBudgetService:
    @classmethod
    def select_for_prompt(cls, retrieved_chunks: list) -> list:
        max_context_tokens = int(getattr(settings, "RAG_MAX_CONTEXT_TOKENS", 6000))
        if max_context_tokens <= 0:
            return list(retrieved_chunks)

        selected = []
        used_tokens = 0
        for item in retrieved_chunks:
            token_count = int(getattr(item.chunk, "token_count", 0) or len(item.chunk.chunk_text.split()))
            if selected and used_tokens + token_count > max_context_tokens:
                break
            selected.append(item)
            used_tokens += token_count
        return selected
