from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from account_module.models import User
from .models import Order, OrderItem
from .serializers import OrderSerializer, OrderItemSerializer
# Create your views here.


