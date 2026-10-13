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
        return obj.current_price if obj.current_price is not None else obj.price

    def get_compare_price(self, obj):
        current = obj.current_price if obj.current_price is not None else obj.price
        return obj.price if current < obj.price else None

    def get_is_available(self, obj):
        return bool(obj.is_active and obj.inventory > 0)
