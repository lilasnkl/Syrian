from dataclasses import dataclass


@dataclass(frozen=True)
class OpenAIUsageSnapshot:
    input_tokens: int = 0
    output_tokens: int = 0
    cached_input_tokens: int = 0

    @classmethod
    def from_response(cls, response) -> "OpenAIUsageSnapshot":
        usage = getattr(response, "usage", None)
        if usage is None:
            return cls()

        input_tokens = cls._read_int(usage, "input_tokens")
        output_tokens = cls._read_int(usage, "output_tokens")
        input_details = cls._read_value(usage, "input_tokens_details")
        cached_input_tokens = cls._read_int(input_details, "cached_tokens") if input_details is not None else 0
        return cls(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cached_input_tokens=cached_input_tokens,
        )

    @staticmethod
    def _read_value(container, field_name: str):
        if isinstance(container, dict):
            return container.get(field_name)
        return getattr(container, field_name, None)

    @classmethod
    def _read_int(cls, container, field_name: str) -> int:
        value = cls._read_value(container, field_name) if container is not None else None
        try:
            return int(value or 0)
        except (TypeError, ValueError):
            return 0
