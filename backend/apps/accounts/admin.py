from django.contrib import admin

from .models import RefreshTokenRecord, User, UserProfile


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "email", "role", "status", "is_staff", "created_at")
    list_filter = ("role", "status", "is_staff", "is_superuser")
    search_fields = ("email", "username", "first_name", "last_name")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "preferred_language", "created_at")
    search_fields = ("user__email",)


@admin.register(RefreshTokenRecord)
class RefreshTokenRecordAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "jti", "is_revoked", "expires_at", "created_at")
    list_filter = ("is_revoked",)
    search_fields = ("user__email", "jti")
