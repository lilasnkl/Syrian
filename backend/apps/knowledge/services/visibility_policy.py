from apps.knowledge.models import KnowledgeSource


class KnowledgeVisibilityPolicy:
    @classmethod
    def allowed_visibilities(cls, *, actor, provider, order=None) -> set[str]:
        if not actor or not getattr(actor, "is_authenticated", False):
            return {KnowledgeSource.VISIBILITY_PUBLIC}

        if actor.role in {"admin", "moderator"}:
            return {choice for choice, _label in KnowledgeSource.VISIBILITY_CHOICES}

        if actor.role == "provider" and provider.user_id == actor.id:
            return {
                KnowledgeSource.VISIBILITY_PUBLIC,
                KnowledgeSource.VISIBILITY_AFTER_CONTACT,
                KnowledgeSource.VISIBILITY_AFTER_ORDER,
                KnowledgeSource.VISIBILITY_PROVIDER_PRIVATE,
            }

        allowed = {KnowledgeSource.VISIBILITY_PUBLIC}
        if cls._has_contact(actor=actor, provider=provider):
            allowed.add(KnowledgeSource.VISIBILITY_AFTER_CONTACT)
        if cls._has_order_access(actor=actor, provider=provider, order=order):
            allowed.add(KnowledgeSource.VISIBILITY_AFTER_ORDER)
        return allowed

    @staticmethod
    def _has_contact(*, actor, provider) -> bool:
        try:
            from apps.chat.models import Conversation
        except ImportError:
            return False

        return Conversation.objects.filter(participants=actor).filter(participants=provider.user).exists()

    @staticmethod
    def _has_order_access(*, actor, provider, order) -> bool:
        if order:
            return order.customer_id == actor.id and order.awarded_provider_id in {None, provider.id}

        try:
            from apps.orders.models import Order
        except ImportError:
            return False

        return Order.objects.filter(customer=actor, awarded_provider=provider).exists()

