from django.utils import timezone
from rest_framework import serializers
from .models import Product, Category


class CategorySerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="title", read_only=True)

    class Meta:
        model = Category
        fields = ["id", "title", "name", "slug", "is_active"]


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(many=True, read_only=True)
    name = serializers.CharField(source="title", read_only=True)
    stock = serializers.IntegerField(source="inventory", read_only=True)
    price = serializers.SerializerMethodField()
    compare_price = serializers.SerializerMethodField()
    is_available = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = "__all__"

    def get_price(self, obj):
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
        return obj.price or 0

    def get_compare_price(self, obj):
        current = self.get_price(obj)
        return obj.price if obj.price is not None and current < obj.price else None

    def get_is_available(self, obj):
        return bool(obj.is_active and obj.inventory > 0)
