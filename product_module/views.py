from django.shortcuts import render
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from product_module.models import Product
from product_module.serializers import ProductSerializer

from rest_framework import generics, status
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


class FavoritesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        favorites = Product.objects.filter(
            favorited_by=request.user,
            is_active=True,
        ).order_by("-created_date")
        serializer = ProductSerializer(
            favorites, many=True, context={"request": request}
        )
        return Response(serializer.data)

    def post(self, request):
        product_id = request.data.get("product_id")
        if not product_id:
            return Response(
                {"detail": "شناسه محصول الزامی است."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        product = Product.objects.filter(pk=product_id, is_active=True).first()
        if product is None:
            return Response(
                {"detail": "محصول پیدا نشد یا غیرفعال است."},
                status=status.HTTP_404_NOT_FOUND,
            )
        product.favorited_by.add(request.user)
        return Response(
            ProductSerializer(product, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def delete(self, request):
        product_id = request.query_params.get("product_id") or request.data.get("product_id")
        if not product_id:
            return Response(
                {"detail": "شناسه محصول الزامی است."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        product = Product.objects.filter(pk=product_id).first()
        if product is not None:
            product.favorited_by.remove(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
