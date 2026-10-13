from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from product_module.models import Product
from .models import Order, OrderItem, PostalAddress
from .serializers import OrderQuoteSerializer, OrderSerializer, CheckoutSerializer


def get_effective_product_price(product):
    """Return the price valid now, without trusting a stale saved current_price."""
    discount = getattr(product, "discounted", None)
    now = timezone.now()
    if (
        discount
        and discount.is_active
        and discount.amount is not None
        and discount.amount >= 0
        and discount.valid_from <= now <= discount.valid_until
    ):
        return discount.amount
    return product.price or 0


class OrderQuoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        quote_serializer = OrderQuoteSerializer(data=request.data)
        quote_serializer.is_valid(raise_exception=True)
        items = quote_serializer.validated_data["items"]
        product_ids = [item["product_id"] for item in items]
        products = {
            product.id: product
            for product in Product.objects.filter(id__in=product_ids, is_active=True)
        }
        missing = sorted(set(product_ids) - set(products))
        if missing:
            return Response(
                {"detail": "یک یا چند محصول وجود ندارد یا غیرفعال شده است.", "product_ids": missing},
                status=status.HTTP_400_BAD_REQUEST,
            )

        quoted_items = []
        subtotal = 0
        for item in items:
            product = products[item["product_id"]]
            quantity = item["quantity"]
            if quantity > product.inventory:
                return Response(
                    {"detail": f"موجودی محصول «{product.title}» کافی نیست."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            unit_price = get_effective_product_price(product)
            if unit_price < 0:
                return Response(
                    {"detail": f"قیمت محصول «{product.title}» معتبر نیست."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            line_total = unit_price * quantity
            subtotal += line_total
            quoted_items.append({
                "product_id": product.pk,
                "name": product.title,
                "quantity": quantity,
                "unit_price": unit_price,
                "line_total": line_total,
            })

        shipping_cost = settings.ORDER_SHIPPING_COST
        return Response({
            "items": quoted_items,
            "subtotal": subtotal,
            "shipping_cost": shipping_cost,
            "total": subtotal + shipping_cost,
            "currency": "TOMAN",
        })


class OrderListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = (
            Order.objects.filter(user=request.user)
            .select_related("postaladdress")
            .prefetch_related("orderitem_set__product")
            .order_by("-created_at", "-id")
        )
        return Response(OrderSerializer(orders, many=True, context={"request": request}).data)

    @transaction.atomic
    def post(self, request):
        checkout = CheckoutSerializer(data=request.data)
        checkout.is_valid(raise_exception=True)
        data = checkout.validated_data

        product_ids = [item["product_id"] for item in data["items"]]
        products = {
            product.id: product
            for product in Product.objects.select_for_update()
            .filter(id__in=product_ids, is_active=True)
            .order_by("id")
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
            if get_effective_product_price(product) < 0:
                return Response(
                    {"detail": f"قیمت محصول «{product.title}» معتبر نیست."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Inventory is reserved by decrementing stock inside the same transaction.
        # It is restored if a pending unpaid order is cancelled.
        order = Order.objects.create(
            user=request.user,
            is_paid=False,
            status=Order.Status.PENDING,
            expires_at=timezone.now() + timedelta(minutes=settings.ORDER_PAYMENT_WINDOW_MINUTES),
        )
        address_data = dict(data["shipping_address"])
        PostalAddress.objects.create(order=order, shipping_cost=settings.ORDER_SHIPPING_COST, **address_data)

        for item in data["items"]:
            product = products[item["product_id"]]
            quantity = item["quantity"]
            unit_price = get_effective_product_price(product)
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=quantity,
                unit_price=unit_price,
                # final_price remains the total for this order line for backwards compatibility.
                final_price=unit_price * quantity,
                final_discount=0,
            )
            product.inventory -= quantity
            product.save(update_fields=["inventory"])

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
            .select_related("postaladdress")
            .prefetch_related("orderitem_set__product")
        )


class CancelOrderView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        try:
            order = (
                Order.objects.select_for_update()
                .prefetch_related("orderitem_set__product")
                .get(pk=pk, user=request.user)
            )
        except Order.DoesNotExist:
            return Response({"detail": "سفارش پیدا نشد."}, status=status.HTTP_404_NOT_FOUND)

        if order.is_paid or order.status != Order.Status.PENDING:
            return Response(
                {"detail": "فقط سفارش پرداخت‌نشده و در انتظار پرداخت قابل لغو است."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for item in order.orderitem_set.all():
            product = Product.objects.select_for_update().filter(pk=item.product_id).first()
            if product:
                product.inventory += item.quantity
                product.save(update_fields=["inventory"])

        order.status = Order.Status.CANCELLED
        order.save(update_fields=["status", "updated_at"])
        return Response(OrderSerializer(order, context={"request": request}).data)
