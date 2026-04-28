"""Shared JSON shape for current-user responses (login, GET/PATCH me)."""


def build_user_payload(user) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "full_name": getattr(user, "full_name", "") or "",
        "role": user.role,
        "phone_number": getattr(user, "phone_number", "") or "",
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if getattr(user, "created_at", None) else None,
        "updated_at": user.updated_at.isoformat() if getattr(user, "updated_at", None) else None,
        "last_login": user.last_login.isoformat() if getattr(user, "last_login", None) else None,
    }
