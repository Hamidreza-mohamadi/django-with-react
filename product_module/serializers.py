from django.utils import timezone
from rest_framework import serializers
from .models import AttributeValue, Product, ProductVariant, Category


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
    variants = ProductVariantSerializer(many=True, read_only=True)
    stock = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = ["id", "sku", "price", "stock", "is_active", "attribute_values"]


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(many=True, read_only=True)
    name = serializers.CharField(source="title", read_only=True)
    stock = serializers.IntegerField(source="inventory", read_only=True)
    price = serializers.SerializerMethodField()
    compare_price = serializers.SerializerMethodField()
    is_available = serializers.SerializerMethodField()
    views = serializers.IntegerField(read_only=True)
    sales_count = serializers.IntegerField(read_only=True)
    attribute_values = ProductAttributeSerializer(source="attributes", many=True, read_only=True)

    class Meta:
        model = Product
        exclude = ("favorited_by", "attributes")
        fields = None

    def get_stock(self, obj):
        variants = getattr(obj, "variants", None)
        if variants is not None:
            return sum(variant.inventory for variant in variants.all() if variant.is_active)
        return getattr(obj, "inventory", 0)

    def get_price(self, obj):
        variants = list(obj.variants.filter(is_active=True).order_by("price", "id"))
        base_price = variants[0].price if variants else (obj.price or 0)
        discount = getattr(obj, "discounted", None)
        now = timezone.now()
        if (
            discount
            and discount.is_active
            and discount.amount is not None
            and discount.amount >= 0
            and discount.valid_from <= now <= discount.valid_until
        ):
            return discount.amount
        return base_price

    def get_compare_price(self, obj):
        current = self.get_price(obj)
        variants = obj.variants.filter(is_active=True).order_by("price", "id")
        regular_price = variants.first().price if variants.exists() else (obj.price or 0)
        return regular_price if current < regular_price else None

    def get_is_available(self, obj):
        return bool(obj.is_active and self.get_stock(obj) > 0)
