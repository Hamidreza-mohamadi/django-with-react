from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

from .models import Order, OrderItem, PostalAddress
from product_module.models import Product, ProductVariant


class OrderProductSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="title", read_only=True)
    price = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "slug", "price", "image"]

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
        variant = obj.variants.filter(is_active=True).order_by("price", "id").first()
        return variant.price if variant else 0

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
    variant = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    unit_price = serializers.SerializerMethodField()
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "product", "variant", "quantity", "unit_price", "price", "line_total", "final_discount"]

    def get_variant(self, obj):
        if not obj.variant_id:
            return None
        return {
            "id": obj.variant_id,
            "sku": obj.variant.sku,
            "attributes": [
                {"title": value.attribute.title, "value": value.value}
                for value in obj.variant.attributes.select_related("attribute").all()
            ],
        }

    def get_unit_price(self, obj):
        if obj.unit_price is not None:
            return obj.unit_price
        return obj.item_total_price() // max(obj.quantity, 1)

    def get_price(self, obj):
        # Legacy alias: price is the total for this order line.
        return obj.item_total_price()

    def get_line_total(self, obj):
        return obj.item_total_price()


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(source="orderitem_set", many=True, read_only=True)
    address = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    shipping_cost = serializers.SerializerMethodField()
    can_simulate_payment = serializers.SerializerMethodField()
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Order
        fields = ["id", "user", "pay_date", "is_paid", "status", "created_at", "updated_at", "expires_at", "shipping_cost", "total", "items", "address", "can_simulate_payment"]
        read_only_fields = fields

    def get_can_simulate_payment(self, obj):
        return bool(settings.DEBUG and not obj.is_paid and obj.status == Order.Status.PENDING)

    def get_shipping_cost(self, obj):
        try:
            return obj.postaladdress.shipping_cost or 0
        except PostalAddress.DoesNotExist:
            return 0

    def get_total(self, obj):
        return obj.calculate_total_price()

    def get_address(self, obj):
        try:
            address = obj.postaladdress
        except PostalAddress.DoesNotExist:
            return None
        return PostalAddressSerializer(address).data


class CheckoutItemSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField(min_value=1, required=False)
    # Backwards compatibility for older clients; accepted only if the product
    # has exactly one active variant.
    product_id = serializers.IntegerField(min_value=1, required=False)
    quantity = serializers.IntegerField(min_value=1, max_value=100)

    def validate(self, attrs):
        if not attrs.get("variant_id") and not attrs.get("product_id"):
            raise serializers.ValidationError("شناسه تنوع محصول الزامی است.")
        return attrs

class CheckoutSerializer(serializers.Serializer):
    items = CheckoutItemSerializer(many=True, allow_empty=False)
    shipping_address = PostalAddressSerializer()

    def validate_items(self, items):
        keys = [(item.get("variant_id"), item.get("product_id")) for item in items]
        if len(keys) != len(set(keys)):
            raise serializers.ValidationError("هر تنوع محصول باید فقط یک بار در سفارش ارسال شود.")
        return items

    def validate_shipping_address(self, value):
        for field in ("city", "postal_code", "exact_address", "phone"):
            if not str(value.get(field, "")).strip():
                raise serializers.ValidationError({field: "این فیلد الزامی است."})
        return value


class OrderQuoteSerializer(serializers.Serializer):
    items = CheckoutItemSerializer(many=True, allow_empty=False)

    def validate_items(self, items):
        keys = [(item.get("variant_id"), item.get("product_id")) for item in items]
        if len(keys) != len(set(keys)):
            raise serializers.ValidationError("هر تنوع محصول باید فقط یک بار در سفارش ارسال شود.")
        return items
