from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from account_module import views

urlpatterns = [
    path("me/", views.CurrentUserView.as_view(), name="current-user"),
    path("login/", views.LoginView.as_view(), name="api-login"),
    path("token/", views.LoginView.as_view(), name="api-token"),
    path("token/refresh/", TokenRefreshView.as_view(), name="api-token-refresh"),
    path("register/", views.RegisterView.as_view(), name="api-register"),
    path("logout/", views.LogoutView.as_view(), name="api-logout"),
]
