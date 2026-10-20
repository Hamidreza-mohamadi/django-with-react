from django.utils import timezone
from rest_framework import serializers

from .models import AttributeValue, Category, Product, ProductVariant


class CategorySerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="title", read_only=True)
    description = serializers.CharField(source="about", read_only=True)

    class Meta:
        model = Category
        fields = ["id", "title", "name", "slug", "is_active", "image", "description"]


class ProductAttributeSerializer(serializers.ModelSerializer):
    attribute_id = serializers.IntegerField(source="attribute.id", read_only=True)
    title = serializers.CharField(source="attribute.title", read_only=True)

    class Meta:
        model = AttributeValue
        fields = ["id", "attribute_id", "title", "value"]


class ProductVariantSerializer(serializers.ModelSerializer):
    attribute_values = ProductAttributeSerializer(source="attributes", many=True, read_only=True)
    stock = serializers.IntegerField(source="inventory", read_only=True)
    regular_price = serializers.IntegerField(source="price", read_only=True)
    price = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = ["id", "sku", "price", "regular_price", "stock", "is_active", "attribute_values"]

    def get_price(self, obj):
        return obj.effective_price


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(many=True, read_only=True)
    name = serializers.CharField(source="title", read_only=True)
    stock = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    compare_price = serializers.SerializerMethodField()
    is_available = serializers.SerializerMethodField()
    views = serializers.IntegerField(read_only=True)
    sales_count = serializers.IntegerField(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        exclude = ("favorited_by",)

    def get_stock(self, obj):
        return sum(
            variant.inventory
            for variant in obj.variants.all()
            if variant.is_active
        )

    def get_price(self, obj):
        variant = obj.variants.filter(is_active=True).order_by("price", "id").first()
        base_price = variant.price if variant else 0
        return variant.effective_price if variant else base_price

    def get_compare_price(self, obj):
        regular_variant = obj.variants.filter(is_active=True).order_by("price", "id").first()
        regular_price = regular_variant.price if regular_variant else 0
        current = self.get_price(obj)
        return regular_price if current < regular_price else None

    def get_is_available(self, obj):
        return bool(obj.is_active and self.get_stock(obj) > 0)
