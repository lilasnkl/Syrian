from django.db import transaction

from shared.exceptions import BusinessRuleViolation
from shared.constants import ACTIVE
from apps.accounts.repositories import UserRepository


class AuthService:
    @staticmethod
    @transaction.atomic
    def register_user(*, email: str, password: str, first_name: str = "", last_name: str = "", role: str = "customer"):
        if UserRepository.get_by_email(email):
            raise BusinessRuleViolation(
                detail="Email already exists.",
                code="email_taken",
                details={"email": ["This email is already registered."]},
            )

        return UserRepository.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role,
            status=ACTIVE,
        )
