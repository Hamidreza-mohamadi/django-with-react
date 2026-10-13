from django.db import transaction
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from product_module.models import Product
from .models import Order, OrderItem, PostalAddress
from .serializers import OrderSerializer, CheckoutSerializer


class OrderListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = (
            Order.objects.filter(user=request.user)
            .prefetch_related("orderitem_set__product")
            .order_by("-id")
        )
        return Response(
            OrderSerializer(orders, many=True, context={"request": request}).data
        )

    @transaction.atomic
    def post(self, request):
        checkout = CheckoutSerializer(data=request.data)
        checkout.is_valid(raise_exception=True)
        data = checkout.validated_data

        product_ids = [item["product_id"] for item in data["items"]]
        products = {
            product.id: product
            for product in Product.objects.select_for_update().filter(
                id__in=product_ids, is_active=True
            )
        }

        missing = sorted(set(product_ids) - set(products))
        if missing:
            return Response(
                {"detail": "یک یا چند محصول وجود ندارد یا غیرفعال شده است.", "product_ids": missing},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for item in data["items"]:
            product = products[item["product_id"]]
            if item["quantity"] > product.inventory:
                return Response(
                    {"detail": f"موجودی محصول «{product.title}» کافی نیست."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        order = Order.objects.create(user=request.user, is_paid=False)
        address_data = dict(data["shipping_address"])
        address_data["order"] = order
        PostalAddress.objects.create(**address_data)

        for item in data["items"]:
            product = products[item["product_id"]]
            unit_price = product.current_price if product.current_price is not None else product.price
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=item["quantity"],
                # final_price stores the line total for this order, protecting it
                # from later changes to the product's current price.
                final_price=unit_price * item["quantity"],
                final_discount=0,
            )

        order.refresh_from_db()
        return Response(
            OrderSerializer(order, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .prefetch_related("orderitem_set__product")
            .order_by("-id")
        )
