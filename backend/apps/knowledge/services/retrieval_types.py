from dataclasses import dataclass


@dataclass(frozen=True)
class RetrievedChunk:
    chunk: object
    score: float
    lexical_score: float
    vector_score: float


@dataclass(frozen=True)
class VectorSearchCandidate:
    chunk: object
    vector_score: float

