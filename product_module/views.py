from datetime import timedelta

from django.db.models import Count, IntegerField, Max, Min, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import generics, status
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from product_module.filters import ProductFilter
from product_module.models import Attribute, AttributeValue, Category, Product, ProductVisit
from product_module.serializers import CategorySerializer, ProductSerializer
from order_module.models import OrderItem


class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer
    queryset = Category.objects.filter(is_active=True).order_by("title")


class ProductFilterOptionsView(APIView):
    permission_classes = [AllowAny]

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
                product_variants__product__in=products,
                product_variants__is_active=True,
                attribute__title__iregex=r"(رنگ|color)",
            )
            .values_list("value", flat=True)
            .distinct()
            .order_by("value")
        )
        # Dynamic product attributes are category-specific. Do not show
        # every attribute across the whole catalog when no category is selected.
        if category:
            category_attributes = Category.objects.filter(
                slug=category, is_active=True
            ).values_list("attributes__id", flat=True)
            attribute_ids = [
                attribute_id for attribute_id in category_attributes
                if attribute_id is not None
            ]
        else:
            attribute_ids = []
        attributes = []
        for attribute in Attribute.objects.filter(id__in=attribute_ids).order_by("title"):
            values = list(
                AttributeValue.objects.filter(
                    product_variants__product__in=products,
                    product_variants__is_active=True,
                    attribute=attribute,
                ).exclude(value="")
                .values_list("value", flat=True)
                .distinct()
                .order_by("value")
            )
            attributes.append({"id": attribute.id, "title": attribute.title, "values": values})
        max_price = (
            products.annotate(
                effective_price=Coalesce(
                    Min("variants__price"), Value(0), output_field=IntegerField()
                )
            ).aggregate(max_price=Max("effective_price"))["max_price"]
            or 0
        )
        return Response(
            {"brands": brands, "colors": colors, "attributes": attributes, "max_price": max_price}
        )


class ProductListPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 48


class ProductListView(generics.ListAPIView):
    serializer_class = ProductSerializer
    queryset = Product.objects.filter(is_active=True)
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ["title", "description"]
    ordering_fields = ["created_date", "current_price", "sales_count", "views", "rating_sort"]
    ordering = ["-created_date"]
    pagination_class = ProductListPagination

    def get_queryset(self):
        paid_units = (
            OrderItem.objects.filter(
                product_id=OuterRef("pk"),
                order__is_paid=True,
            )
            .order_by()
            .values("product_id")
            .annotate(total=Sum("quantity"))
            .values("total")[:1]
        )
        return (
            Product.objects.filter(is_active=True)
            .annotate(
                current_price=Min("variants__price"),
                effective_price=Coalesce(
                    Min("variants__price"), Value(0), output_field=IntegerField()
                ),
                sales_count=Coalesce(
                    Subquery(paid_units, output_field=IntegerField()),
                    Value(0),
                    output_field=IntegerField(),
                ),
                views=Count("productvisit__id", distinct=True),
                rating_sort=Coalesce("rating", Value(0), output_field=IntegerField()),
            )
            .distinct()
        )


class ProductDetailGeneric(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    queryset = Product.objects.filter(is_active=True).order_by("created_date")
    serializer_class = ProductSerializer
    lookup_field = "slug"

    def get_object(self):
        product = super().get_object()
        self._record_product_view(product)
        return product

    def _record_product_view(self, product):
        # Count a visitor once per product in a 30-minute window, rather than
        # inflating popularity on refreshes and repeated API calls from SSR.
        now = timezone.now()
        ip_address = self.request.META.get("REMOTE_ADDR", "")[:100] or "unknown"
        recent_visits = ProductVisit.objects.filter(
            product=product,
            viewed_at__gte=now - timedelta(minutes=30),
        )
        visitor_key = self.request.headers.get("X-Visitor-ID", "")[:64]
        if self.request.user.is_authenticated:
            recent_visits = recent_visits.filter(user=self.request.user)
            visitor = self.request.user
            visitor_key = ""
        else:
            visitor = None
            if visitor_key:
                recent_visits = recent_visits.filter(user__isnull=True, visitor_key=visitor_key)
            else:
                recent_visits = recent_visits.filter(user__isnull=True, ip_address=ip_address)

        if not recent_visits.exists():
            ProductVisit.objects.create(
                product=product,
                user=visitor,
                ip_address=ip_address,
                visitor_key=visitor_key,
                viewed_at=now,
            )


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
