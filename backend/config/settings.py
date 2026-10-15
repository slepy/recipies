import os
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = os.getenv("DJANGO_DEBUG", "false").lower() == "true"
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DEBUG is false.")
    SECRET_KEY = "development-only-secret-change-me"
ALLOWED_HOSTS = [host for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,backend").split(",") if host]
ALLOWED_FRONTEND_ORIGINS = [
    origin.rstrip("/")
    for origin in os.getenv("ALLOWED_FRONTEND_ORIGINS", "http://localhost:5173").split(",")
    if origin
]
CSRF_TRUSTED_ORIGINS = ALLOWED_FRONTEND_ORIGINS

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "accounts",
    "authentication.apps.AuthenticationConfig",
    "integrations.apps.IntegrationsConfig",
    "recipes.apps.RecipesConfig",
    "meal_plans.apps.MealPlansConfig",
    "shopping_lists.apps.ShoppingListsConfig",
    "recipe_sets.apps.RecipeSetsConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
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

database_engine = os.getenv("DB_ENGINE", "postgres").lower()

if database_engine == "postgres":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB", "recipes"),
            "USER": os.getenv("POSTGRES_USER", "recipes"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD", "recipes"),
            "HOST": os.getenv("POSTGRES_HOST", "localhost"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
        }
    }
elif database_engine == "sqlite":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": os.getenv("SQLITE_NAME", ":memory:"),
        }
    }
else:
    raise ValueError("DB_ENGINE must be either 'postgres' or 'sqlite'.")

AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "pl-pl"
TIME_ZONE = "Europe/Warsaw"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
MEDIA_ROOT = BASE_DIR / "media"
DATA_UPLOAD_MAX_MEMORY_SIZE = 6 * 1024 * 1024
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.AnonRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {"anon": "100/hour", "login": "5/minute", "register": "5/hour"},
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=24),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "ISSUER": os.getenv("JWT_ISSUER", "recipes-api"),
    "AUDIENCE": os.getenv("JWT_AUDIENCE", "recipes-web"),
}

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_SECURE = not DEBUG
INTEGRATIONS_ENCRYPTION_KEY = os.getenv("INTEGRATIONS_ENCRYPTION_KEY", "")

# Vision-capable model used for recipe-image recognition, per provider (the user does not choose it).
AI_RECOGNITION_MODELS = {
    "openai": os.getenv("AI_RECOGNITION_MODEL_OPENAI", "gpt-4o"),
    "openrouter": os.getenv("AI_RECOGNITION_MODEL_OPENROUTER", "google/gemini-2.5-flash"),
}
AI_RECOGNITION_TIMEOUT_SECONDS = 60
