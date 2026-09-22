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
from django.shortcuts import render

# Create your views here.

class ProductListView(generics.ListAPIView):
    serializer_class = ProductSerializer
    queryset = Product.objects.filter(is_active=True)

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
    ]

    filterset_class = ProductFilter

    search_fields = [
        "title",
        "description",
    ]


class ProductDetailGeneric(generics.RetrieveAPIView):
    queryset = Product.objects.all().order_by('created_date')
    serializer_class = ProductSerializer
    lookup_field = "slug"