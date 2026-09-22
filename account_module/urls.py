from django.urls import path

from account_module import views

urlpatterns = [
    # path('sign-up/', views.SignUp.as_view(), name='sign-in'),
    # path('login/', views.LogIn.as_view(), name='login'),
    # path('active-account/<code>/', views.ActiveAccount.as_view(), name='active-account'),
    # path('logout/', views.LogOut.as_view(), name='logout'),
    # path('forget-pass/', views.ForgetPassword.as_view(), name='forget-pass'),
    # path('rewrite-pass/<code>/', views.RewritePass.as_view(), name='rewrite-password'),
    # path('change-pass/', views.ChangePassword.as_view(), name='change-pass'),
    # path('edit-profile/', views.EditProfile.as_view(), name='edit-profile'),
    path('me/', views.CurrentUserView.as_view(), name='sign-in'),
    # path('user/', views.CurrentUserView.as_view(), name='current-user'),
    path('login/', views.LoginView.as_view(), name='api-login'),
    path('logout/', views.LogoutView.as_view(), name='api-logout'),

]