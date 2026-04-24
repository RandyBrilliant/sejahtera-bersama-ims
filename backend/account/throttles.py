"""
Rate limiting for account/auth endpoints.
Stricter limits for login, refresh, and password-change flows.
"""
from rest_framework.throttling import SimpleRateThrottle


class AuthRateThrottle(SimpleRateThrottle):
    """
    Stricter throttle for auth endpoints (login, refresh).
    Scope: auth (e.g. 10/min per IP).
    """
    scope = "auth"

    def get_cache_key(self, request, view):
        # Authenticated endpoints (e.g. change password): throttle per user.
        if request.user and request.user.is_authenticated:
            ident = f"user:{request.user.pk}"
            return self.cache_format % {"scope": self.scope, "ident": ident}

        # Public login attempts: throttle by username+IP when available.
        username = (request.data.get("username") or "").strip().lower()
        if username:
            ident = f"login:{username}:{self.get_ident(request)}"
            return self.cache_format % {"scope": self.scope, "ident": ident}

        # Fallback for requests without username payload.
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class AuthPublicRateThrottle(SimpleRateThrottle):
    """
    Generic throttle for public endpoints (reserved for future use).
    Scope: auth_public (e.g. 5/min per IP).
    """
    scope = "auth_public"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }
