from django.shortcuts import render
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from product_module.models import Product
from product_module.serializers import ProductSerializer

from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from product_module.filters import ProductFilter
from rest_framework.filters import SearchFilter


# Create your views here.


class HomeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        products = Product.objects.filter(is_active=True).order_by('-created_date')[:3]
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)




