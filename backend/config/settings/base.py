import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import unquote, urlparse
from corsheaders.defaults import default_headers

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def _load_env_file() -> None:
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if key and key not in os.environ:
            os.environ[key] = value


_load_env_file()

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "unsafe-dev-secret-key")
DEBUG = os.environ.get("DJANGO_DEBUG", "True").lower() == "true"
ALLOWED_HOSTS = [h for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",") if h]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "corsheaders",
    "apps.accounts.apps.AccountsConfig",
    "apps.providers.apps.ProvidersConfig",
    "apps.services.apps.ServicesConfig",
    "apps.knowledge.apps.KnowledgeConfig",
    "apps.customer_assistant.apps.CustomerAssistantConfig",
    "apps.recommendations.apps.RecommendationsConfig",
    "apps.orders.apps.OrdersConfig",
    "apps.bids.apps.BidsConfig",
    "apps.chat.apps.ChatConfig",
    "apps.complaints.apps.ComplaintsConfig",
    "apps.reviews.apps.ReviewsConfig",
    "apps.notifications.apps.NotificationsConfig",
    "apps.admin_panel.apps.AdminPanelConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

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

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()

DB_NAME = os.environ.get("DB_NAME") or os.environ.get("POSTGRES_DB")
DB_USER = os.environ.get("DB_USER") or os.environ.get("POSTGRES_USER")
DB_PASSWORD = os.environ.get("DB_PASSWORD") or os.environ.get("POSTGRES_PASSWORD")
DB_HOST = os.environ.get("DB_HOST") or os.environ.get("POSTGRES_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT") or os.environ.get("POSTGRES_PORT", "5432")
DB_CONN_MAX_AGE = int(os.environ.get("DB_CONN_MAX_AGE", "60"))
DB_SSLMODE = os.environ.get("DB_SSLMODE", os.environ.get("POSTGRES_SSLMODE", "prefer"))
DB_ENGINE = os.environ.get(
    "DB_ENGINE",
    "django.db.backends.postgresql" if DB_NAME else "django.db.backends.sqlite3",
)

if DATABASE_URL:
    parsed = urlparse(DATABASE_URL)
    if parsed.scheme in {"postgres", "postgresql"}:
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": unquote(parsed.path.lstrip("/")),
                "USER": unquote(parsed.username or ""),
                "PASSWORD": unquote(parsed.password or ""),
                "HOST": parsed.hostname or "localhost",
                "PORT": str(parsed.port or 5432),
                "CONN_MAX_AGE": DB_CONN_MAX_AGE,
                "OPTIONS": {
                    "sslmode": DB_SSLMODE,
                },
            }
        }
    else:
        sqlite_path = unquote(parsed.path.lstrip("/")) if parsed.path else "db.sqlite3"
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": sqlite_path if os.path.isabs(sqlite_path) else BASE_DIR / sqlite_path,
            }
        }
elif DB_ENGINE == "django.db.backends.postgresql" or DB_NAME:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": DB_NAME or "syrian_services",
            "USER": DB_USER or "postgres",
            "PASSWORD": DB_PASSWORD or "",
            "HOST": DB_HOST,
            "PORT": DB_PORT,
            "CONN_MAX_AGE": DB_CONN_MAX_AGE,
            "OPTIONS": {
                "sslmode": DB_SSLMODE,
            },
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.accounts.api.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "shared.pagination.cursor.StandardCursorPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
        "rest_framework.filters.SearchFilter",
    ),
    "EXCEPTION_HANDLER": "shared.exceptions.handlers.custom_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

JWT_COOKIE_ACCESS = "access_token"
JWT_COOKIE_REFRESH = "refresh_token"
JWT_COOKIE_SECURE = os.environ.get("JWT_COOKIE_SECURE", "False").lower() == "true"
JWT_COOKIE_SAMESITE = os.environ.get("JWT_COOKIE_SAMESITE", "Lax")
CORS_ALLOWED_ORIGINS = [
    u for u in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080").split(",") if u
]
CORS_ALLOW_CREDENTIALS = os.environ.get("CORS_ALLOW_CREDENTIALS", "True").lower() == "true"
CORS_ALLOW_HEADERS = list(default_headers) + ["x-csrftoken"]
CORS_EXPOSE_HEADERS = ["X-CSRFToken"]
CSRF_TRUSTED_ORIGINS = [u for u in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",") if u] or CORS_ALLOWED_ORIGINS

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_EMBEDDING_MODEL = os.environ.get("OPENAI_EMBEDDING_MODEL", "text-embedding-3-large")
OPENAI_CUSTOMER_QA_MODEL = os.environ.get("OPENAI_CUSTOMER_QA_MODEL", "gpt-4o-mini")
OPENAI_CUSTOMER_QA_TIMEOUT = int(os.environ.get("OPENAI_CUSTOMER_QA_TIMEOUT", "45"))
OPENAI_CUSTOMER_QA_REASONING_EFFORT = os.environ.get("OPENAI_CUSTOMER_QA_REASONING_EFFORT", "medium")
OPENAI_CUSTOMER_QA_VERBOSITY = os.environ.get("OPENAI_CUSTOMER_QA_VERBOSITY", "medium")
OPENAI_CUSTOMER_QA_MAX_OUTPUT_TOKENS = int(os.environ.get("OPENAI_CUSTOMER_QA_MAX_OUTPUT_TOKENS", "600"))
OPENAI_CUSTOMER_QA_PROMPT_CACHE_RETENTION = os.environ.get("OPENAI_CUSTOMER_QA_PROMPT_CACHE_RETENTION", "")

RAG_TOP_K = int(os.environ.get("RAG_TOP_K", "8"))
RAG_MAX_CONTEXT_TOKENS = int(os.environ.get("RAG_MAX_CONTEXT_TOKENS", "6000"))
RAG_MIN_SIMILARITY = float(os.environ.get("RAG_MIN_SIMILARITY", "0.72"))
RAG_VECTOR_BACKEND = os.environ.get("RAG_VECTOR_BACKEND", "postgres_json")
RAG_VECTOR_CANDIDATE_LIMIT = int(os.environ.get("RAG_VECTOR_CANDIDATE_LIMIT", "0"))
RAG_VECTOR_CANDIDATE_MULTIPLIER = int(os.environ.get("RAG_VECTOR_CANDIDATE_MULTIPLIER", "8"))
RAG_ZVEC_PATH = os.environ.get("RAG_ZVEC_PATH", str(BASE_DIR / "var" / "zvec" / "knowledge"))
RAG_CHUNK_TOKENS = int(os.environ.get("RAG_CHUNK_TOKENS", "700"))
RAG_CHUNK_OVERLAP_TOKENS = int(os.environ.get("RAG_CHUNK_OVERLAP_TOKENS", "100"))
RAG_EMBEDDING_CACHE_TTL_SECONDS = int(os.environ.get("RAG_EMBEDDING_CACHE_TTL_SECONDS", str(7 * 24 * 60 * 60)))
RAG_ANSWER_CACHE_TTL_SECONDS = int(os.environ.get("RAG_ANSWER_CACHE_TTL_SECONDS", str(10 * 60)))
RAG_MAX_UPLOAD_MB = int(os.environ.get("RAG_MAX_UPLOAD_MB", "10"))
RAG_ALLOWED_MIME_TYPES = [
    value
    for value in os.environ.get(
        "RAG_ALLOWED_MIME_TYPES",
        ",".join(
            [
                "text/plain",
                "text/markdown",
                "text/csv",
                "application/csv",
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ]
        ),
    ).split(",")
    if value
]
RAG_ENABLE_IMAGE_OCR = os.environ.get("RAG_ENABLE_IMAGE_OCR", "False").lower() == "true"
