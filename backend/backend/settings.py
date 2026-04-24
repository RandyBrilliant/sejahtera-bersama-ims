import os
from datetime import timedelta
from pathlib import Path

from celery.schedules import crontab

BASE_DIR = Path(__file__).resolve().parent.parent


def _env(key, default=None):
    return os.environ.get(key, default)


try:
    import environ

    _environ = environ.Env()
    _environ.read_env(BASE_DIR / ".env")

    def _env(key, default=None):
        return _environ(key, default=default)

except ImportError:
    _environ = None


def _env_bool(key, default=False):
    raw = _env(key, str(default))
    return str(raw).lower() in ("1", "true", "yes", "on")


def _env_csv(key):
    raw = (_env(key, "") or "").strip()
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


SECRET_KEY = _env(
    "SECRET_KEY",
    "django-insecure-rq39(xe))ga3c!s3vk5z_+!n+e5@4f!zbogaa-yj)3s++m=_(l",
)
DEBUG = _env_bool("DEBUG", True)
ALLOWED_HOSTS = _env_csv("ALLOWED_HOSTS")

# Reverse-proxy / HTTPS settings
SECURE_SSL_REDIRECT = _env_bool("SECURE_SSL_REDIRECT", False)
SESSION_COOKIE_SECURE = _env_bool("SESSION_COOKIE_SECURE", False)
CSRF_COOKIE_SECURE = _env_bool("CSRF_COOKIE_SECURE", False)
CSRF_TRUSTED_ORIGINS = _env_csv("CSRF_TRUSTED_ORIGINS")
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "django_filters",
    "corsheaders",
    "account.apps.AccountConfig",
    "inventory.apps.InventoryConfig",
    "main.apps.MainConfig",
]

AUTH_USER_MODEL = "account.CustomUser"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "backend.urls"
WSGI_APPLICATION = "backend.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# Database: prefer DATABASE_URL via django-environ; fallback to sqlite.
if _environ is not None:
    DATABASES = {
        "default": _environ.db(
            "DATABASE_URL",
            default="sqlite:///" + str(BASE_DIR / "db.sqlite3"),
        )
    }
else:
    database_url = os.environ.get("DATABASE_URL", "")
    if database_url.startswith("postgres://") or database_url.startswith("postgresql://"):
        raise ValueError(
            "DATABASE_URL is set but django-environ is not installed. "
            "Install it with: pip install django-environ"
        )
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "id-id"
TIME_ZONE = "Asia/Jakarta"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

CORS_ALLOWED_ORIGINS = _env_csv("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True

# Cache: use Redis when broker is Redis, otherwise locmem.
_broker_url = (_env("CELERY_BROKER_URL", "redis://localhost:6379/0") or "").strip()
_use_redis_cache = _broker_url.startswith("redis")
_cache_location = None
if _use_redis_cache:
    _base = _broker_url.rsplit("/", 1)[0] if "/" in _broker_url else _broker_url
    _cache_location = f"{_base}/2"

if _cache_location:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": _cache_location,
            "KEY_PREFIX": "kms",
            "TIMEOUT": 300,
            "OPTIONS": {},
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "ims-cache",
            "KEY_PREFIX": "kms",
            "TIMEOUT": 300,
            "OPTIONS": {},
        }
    }

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "account.jwt_cookie_auth.JWTCookieAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "DEFAULT_PAGINATION_CLASS": "account.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "account.api_responses.api_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": _env("DRF_THROTTLE_ANON", "30/min"),
        "user": _env("DRF_THROTTLE_USER", "120/min"),
        "auth": _env("DRF_THROTTLE_AUTH", "10/min"),
        "auth_public": _env("DRF_THROTTLE_AUTH_PUBLIC", "5/min"),
    },
}

SIMPLE_JWT = {
    "AUTH_HEADER_TYPES": ("Bearer",),
    "UPDATE_LAST_LOGIN": True,
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(_env("JWT_ACCESS_MINUTES", "15"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(_env("JWT_REFRESH_DAYS", "90"))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_COOKIE_ACCESS_KEY": _env("JWT_ACCESS_COOKIE_NAME", "ims_access"),
    "AUTH_COOKIE_REFRESH_KEY": _env("JWT_REFRESH_COOKIE_NAME", "ims_refresh"),
    "AUTH_COOKIE_SECURE": not DEBUG,
    "AUTH_COOKIE_HTTP_ONLY": True,
    "AUTH_COOKIE_SAMESITE": "Lax",
    "AUTH_COOKIE_PATH": "/",
}

CELERY_BROKER_URL = _broker_url or "redis://localhost:6379/0"
CELERY_RESULT_BACKEND = _env("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60
CELERY_BEAT_SCHEDULE = {}