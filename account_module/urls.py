from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from account_module import views

urlpatterns = [
    path("me/", views.CurrentUserView.as_view(), name="current-user"),
    path("users/<str:username>/", views.PublicUserProfileView.as_view(), name="public-user-profile"),
    path("login/", views.LoginView.as_view(), name="api-login"),
    path("token/", views.LoginView.as_view(), name="api-token"),
    path("token/refresh/", TokenRefreshView.as_view(), name="api-token-refresh"),
    path("register/", views.RegisterView.as_view(), name="api-register"),
    path("active-account/<str:code>/", views.ActiveAccountView.as_view(), name="active-account"),
    path("forget-pass/", views.ForgetPasswordView.as_view(), name="forget-pass"),
    path("rewrite-pass/<str:code>/", views.RewritePassView.as_view(), name="rewrite-password"),
    path("change-pass/", views.ChangePasswordView.as_view(), name="change-pass"),
    path("edit-profile/", views.EditProfileView.as_view(), name="edit-profile"),
    path("logout/", views.LogoutView.as_view(), name="api-logout"),
]
