from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.http import Http404
from django.shortcuts import render, redirect
from django.urls import reverse
from django.utils.crypto import get_random_string
from django.utils.decorators import method_decorator
from django.views.generic import FormView, View
from .forms import SignUpForm, LoginForm, ForgetPasswordForm, RewritePasswordForm, ChangePasswordForm, EditProfileForm
from .models import User
# from utils.email_service import send_email


# Create your views here.

from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from article_module.serializers import UserSerializer
from rest_framework.authtoken.views import ObtainAuthToken


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)



class LoginView(ObtainAuthToken):
    pass



# سیستم خروج از حساب
class LogoutView(APIView):
    pass
    
