from django.contrib import admin
from django.urls import include, path

from authentication.views import CurrentUserView, CsrfTokenView, LoginView, LogoutView, RefreshView, RegisterView


urlpatterns = [
	path("admin/", admin.site.urls),
	path("api/auth/csrf/", CsrfTokenView.as_view(), name="auth-csrf"),
	path("api/auth/register/", RegisterView.as_view(), name="auth-register"),
	path("api/auth/login/", LoginView.as_view(), name="auth-login"),
	path("api/auth/refresh/", RefreshView.as_view(), name="auth-refresh"),
	path("api/auth/logout/", LogoutView.as_view(), name="auth-logout"),
	path("api/auth/me/", CurrentUserView.as_view(), name="auth-me"),
	path("api/integrations/", include("integrations.urls")),
]