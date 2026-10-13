from rest_framework import serializers

from .models import Order, OrderItem, PostalAddress
from product_module.models import Product


class OrderProductSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="title", read_only=True)
    price = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "slug", "price", "image"]

    def get_price(self, obj):
        return obj.current_price if obj.current_price is not None else obj.price

    def get_image(self, obj):
        request = self.context.get("request")
        if not obj.image:
            return None
        url = obj.image.url
        return request.build_absolute_uri(url) if request else url


class PostalAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostalAddress
        fields = ["province", "city", "postal_code", "exact_address", "phone"]
        read_only_fields = []


class OrderItemSerializer(serializers.ModelSerializer):
    product = OrderProductSerializer(read_only=True)
    price = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "product", "quantity", "price", "final_discount"]

    def get_price(self, obj):
        # Total price for this line, based on the order-time price snapshot.
        return obj.item_total_price()


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(source="orderitem_set", many=True, read_only=True)
    address = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Order
        fields = ["id", "user", "pay_date", "is_paid", "status", "created_at", "updated_at", "total", "items", "address"]
        read_only_fields = fields

    def get_total(self, obj):
        return obj.calculate_total_price()

    def get_address(self, obj):
        try:
            address = obj.postaladdress
        except PostalAddress.DoesNotExist:
            return None
        return PostalAddressSerializer(address).data


class CheckoutItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=100)


class CheckoutSerializer(serializers.Serializer):
    items = CheckoutItemSerializer(many=True, allow_empty=False)
    shipping_address = PostalAddressSerializer()

    def validate_items(self, items):
        product_ids = [item["product_id"] for item in items]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError("هر محصول باید فقط یک بار در سفارش ارسال شود.")
        return items

    def validate_shipping_address(self, value):
        for field in ("city", "postal_code", "exact_address", "phone"):
            if not str(value.get(field, "")).strip():
                raise serializers.ValidationError({field: "این فیلد الزامی است."})
        return value
