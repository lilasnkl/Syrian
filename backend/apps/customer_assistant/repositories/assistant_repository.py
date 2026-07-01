from apps.customer_assistant.models import AssistantSession, AssistantTurn


class AssistantRepository:
    @staticmethod
    def get_session(session_id: int):
        return (
            AssistantSession.objects.select_related("customer", "provider", "provider__user", "order", "service")
            .filter(id=session_id)
            .first()
        )

    @staticmethod
    def create_session(**kwargs):
        return AssistantSession.objects.create(**kwargs)

    @staticmethod
    def create_turn(**kwargs):
        return AssistantTurn.objects.create(**kwargs)

