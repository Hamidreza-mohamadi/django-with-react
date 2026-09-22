from rest_framework import serializers

from product_module.serializers import ProductSerializer
from .models import Order , OrderItem, PostalAddress, Allowance
from account_module.models import User
from account_module.serializers import UserSerializer


class OrderSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Order
        fields = '__all__'


class OrderItemSerializer(serializers.ModelSerializer):
    order = OrderSerializer(read_only=True)
    product = ProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = '__all__'


class PostalAddressSerializer(serializers.ModelSerializer):
    order = OrderSerializer(read_only=True)

    class Meta:
        model = PostalAddress
        fields = '__all__'


class AllowanceSerializer(serializers.ModelSerializer):
    order_item = OrderItemSerializer(read_only=True)
    product = ProductSerializer(read_only=True)

    class Meta:
        model = Allowance
        fields = '__all__'