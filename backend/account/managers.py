from django.contrib.auth.base_user import BaseUserManager
from django.utils.translation import gettext_lazy as _


class CustomUserManager(BaseUserManager):
    """Custom manager using username as the authentication identifier."""

    use_in_migrations = True

    def _normalize_username(self, username: str) -> str:
        return (username or "").strip().lower()

    def _create_user(self, username: str, password: str | None, **extra_fields):
        if not username:
            raise ValueError(_("Username is required."))

        username = self._normalize_username(username)

        user = self.model(username=username, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_user(self, username: str, password: str | None = None, **extra_fields):
        """Create a regular user."""
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("role", "WAREHOUSE_STAFF")
        return self._create_user(username, password, **extra_fields)

    def create_superuser(self, username: str, password: str | None = None, **extra_fields):
        """Create an owner superuser."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", "LEADERSHIP")

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))
        if extra_fields.get("role") != "LEADERSHIP":
            raise ValueError(_("Superuser must have role=LEADERSHIP."))

        return self._create_user(username, password, **extra_fields)
