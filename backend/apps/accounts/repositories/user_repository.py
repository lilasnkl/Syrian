from typing import Optional

from apps.accounts.models import User


class UserRepository:
    @staticmethod
    def create_user(**kwargs) -> User:
        password = kwargs.pop("password")
        return User.objects.create_user(password=password, **kwargs)

    @staticmethod
    def get_by_email(email: str) -> Optional[User]:
        return User.objects.filter(email=email).first()

    @staticmethod
    def get_by_id(user_id: int) -> Optional[User]:
        return User.objects.filter(id=user_id).first()

    @staticmethod
    def save(user: User, **attrs) -> User:
        for key, value in attrs.items():
            setattr(user, key, value)
        user.save(update_fields=[*attrs.keys(), "updated_at"])
        return user
