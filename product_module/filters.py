from django_filters import rest_framework as filters

from .models import Product


class CharInFilter(filters.BaseInFilter, filters.CharFilter):
    """Accept comma-separated values such as ?brand=Nike,Adidas."""


class ProductFilter(filters.FilterSet):
    category = filters.CharFilter(field_name="category__slug")
    brand = CharInFilter(field_name="brand__title", lookup_expr="in")
    color = CharInFilter(method="filter_color")
    min_price = filters.NumberFilter(method="filter_min_price")
    max_price = filters.NumberFilter(method="filter_max_price")
    in_stock = filters.BooleanFilter(method="filter_in_stock")

    class Meta:
        model = Product
        fields = ["category", "brand", "color", "min_price", "max_price", "in_stock"]

    def filter_color(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(
            variants__attributes__value__in=value,
            variants__attributes__attribute__title__iregex=r"(رنگ|color)",
        ).distinct()

    def filter_min_price(self, queryset, name, value):
        if value is None:
            return queryset
        return queryset.filter(effective_price__gte=value)

    def filter_max_price(self, queryset, name, value):
        if value is None:
            return queryset
        return queryset.filter(effective_price__lte=value)

    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(variants__is_active=True, variants__inventory__gt=0).distinct()
        if value is False:
            return queryset.exclude(variants__is_active=True, variants__inventory__gt=0).distinct()
        return queryset

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        # Dynamic category attributes use query params such as ?attribute_3=8GB,16GB.
        for key, raw_value in self.data.items():
            if not key.startswith("attribute_") or not raw_value:
                continue
            try:
                attribute_id = int(key.removeprefix("attribute_"))
            except ValueError:
                continue
            values = [value.strip() for value in str(raw_value).split(",") if value.strip()]
            if values:
                queryset = queryset.filter(
                    variants__attributes__attribute_id=attribute_id,
                    variants__attributes__value__in=values,
                )
        return queryset.distinct()
