from django.db.models import Count, IntegerField, Max, Q, Value
from django.db.models.functions import Coalesce
from rest_framework import generics, status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from product_module.filters import ProductFilter
from product_module.models import AttributeValue, Category, Product, ProductVisit
from product_module.serializers import CategorySerializer, ProductSerializer


class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer
    queryset = Category.objects.filter(is_active=True).order_by("title")


class ProductFilterOptionsView(APIView):
    permission_classes = []

    def get(self, request):
        products = Product.objects.filter(is_active=True)
        category = request.query_params.get("category")
        if category:
            products = products.filter(category__slug=category)

        brands = list(
            products.exclude(brand__isnull=True)
            .values_list("brand__title", flat=True)
            .distinct()
            .order_by("brand__title")
        )
        colors = list(
            AttributeValue.objects.filter(
                product__in=products,
                attribute__title__iregex=r"(رنگ|color)",
            )
            .values_list("value", flat=True)
            .distinct()
            .order_by("value")
        )
        max_price = (
            products.annotate(
                effective_price=Coalesce(
                    "current_price", "price", output_field=IntegerField()
                )
            ).aggregate(max_price=Max("effective_price"))["max_price"]
            or 0
        )
        return Response(
            {"brands": brands, "colors": colors, "max_price": max_price}
        )


class ProductListView(generics.ListAPIView):
    serializer_class = ProductSerializer
    queryset = Product.objects.filter(is_active=True)
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ["title", "description"]
    ordering_fields = ["created_date", "current_price", "sales_count", "views"]
    ordering = ["-created_date"]

    def get_queryset(self):
        return (
            Product.objects.filter(is_active=True)
            .annotate(
                effective_price=Coalesce(
                    "current_price", "price", output_field=IntegerField()
                ),
                sales_count=Count(
                    "orderitem",
                    filter=Q(orderitem__order__is_paid=True),
                    distinct=True,
                ),
                views=Count("productvisit", distinct=True),
            )
            .distinct()
        )


class ProductDetailGeneric(generics.RetrieveAPIView):
    queryset = Product.objects.all().order_by("created_date")
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
