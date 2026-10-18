from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from product_module.models import Product, ProductVariant
from .models import Order, OrderItem, PostalAddress
from .serializers import OrderQuoteSerializer, OrderSerializer, CheckoutSerializer


def get_effective_variant_price(variant):
    """Apply the existing product-level promotion to a variant's regular price."""
    product = variant.product
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
    return variant.price


def resolve_variant(item, *, lock=False):
    """Resolve a requested SKU; product_id is supported only for single-variant products."""
    queryset = ProductVariant.objects.select_related("product", "product__discounted")
    if lock:
        queryset = queryset.select_for_update()

    if item.get("variant_id"):
        variant = queryset.filter(
            pk=item["variant_id"], is_active=True, product__is_active=True
        ).first()
        if variant is None:
            raise ValueError("تنوع انتخاب‌شده وجود ندارد یا غیرفعال است.")
        return variant

    product_id = item.get("product_id")
    variants = list(
        queryset.filter(product_id=product_id, is_active=True, product__is_active=True)
        .order_by("id")[:2]
    )
    if not variants:
        raise ValueError("محصول وجود ندارد یا تنوع فعالی برای آن تعریف نشده است.")
    if len(variants) != 1:
        raise ValueError("برای این محصول چند تنوع وجود دارد؛ لطفاً یک تنوع مشخص انتخاب کنید.")
    return variants[0]


def variant_display_name(variant):
    values = list(
        variant.attributes.select_related("attribute").order_by("attribute__title")
    )
    suffix = "، ".join(f"{value.attribute.title}: {value.value}" for value in values)
    return f"{variant.product.title} ({suffix})" if suffix else variant.product.title


class OrderQuoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = OrderQuoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quoted_items = []
        subtotal = 0
        original_subtotal = 0

        try:
            for item in serializer.validated_data["items"]:
                variant = resolve_variant(item)
                quantity = item["quantity"]
                if quantity > variant.inventory:
                    return Response(
                        {"detail": f"موجودی «{variant_display_name(variant)}» کافی نیست."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                unit_price = get_effective_variant_price(variant)
                if unit_price < 0:
                    return Response(
                        {"detail": f"قیمت «{variant_display_name(variant)}» معتبر نیست."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                regular_unit_price = variant.price
                line_total = unit_price * quantity
                line_discount = max(0, regular_unit_price - unit_price) * quantity
                subtotal += line_total
                original_subtotal += regular_unit_price * quantity
                quoted_items.append({
                    "product_id": variant.product_id,
                    "variant_id": variant.pk,
                    "name": variant_display_name(variant),
                    "quantity": quantity,
                    "regular_unit_price": regular_unit_price,
                    "unit_price": unit_price,
                    "line_discount": line_discount,
                    "line_total": line_total,
                })
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        discount_total = max(0, original_subtotal - subtotal)
        shipping_cost = settings.ORDER_SHIPPING_COST
        return Response({
            "items": quoted_items,
            "original_subtotal": original_subtotal,
            "discount_total": discount_total,
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
            .prefetch_related(
                "orderitem_set__product",
                "orderitem_set__variant__attributes__attribute",
            )
            .order_by("-created_at", "-id")
        )
        return Response(OrderSerializer(orders, many=True, context={"request": request}).data)

    @transaction.atomic
    def post(self, request):
        checkout = CheckoutSerializer(data=request.data)
        checkout.is_valid(raise_exception=True)
        data = checkout.validated_data

        resolved = []
        try:
            for item in data["items"]:
                variant = resolve_variant(item, lock=True)
                resolved.append((variant, item["quantity"]))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        for variant, quantity in resolved:
            if quantity > variant.inventory:
                return Response(
                    {"detail": f"موجودی «{variant_display_name(variant)}» کافی نیست."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if get_effective_variant_price(variant) < 0:
                return Response(
                    {"detail": f"قیمت «{variant_display_name(variant)}» معتبر نیست."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        order = Order.objects.create(
            user=request.user,
            is_paid=False,
            status=Order.Status.PENDING,
            expires_at=timezone.now() + timedelta(minutes=settings.ORDER_PAYMENT_WINDOW_MINUTES),
        )
        address_data = dict(data["shipping_address"])
        PostalAddress.objects.create(
            order=order, shipping_cost=settings.ORDER_SHIPPING_COST, **address_data
        )

        for variant, quantity in resolved:
            unit_price = get_effective_variant_price(variant)
            OrderItem.objects.create(
                order=order,
                product=variant.product,
                variant=variant,
                quantity=quantity,
                unit_price=unit_price,
                final_price=unit_price * quantity,
                final_discount=max(0, variant.price - unit_price) * quantity,
            )
            variant.inventory -= quantity
            variant.save(update_fields=["inventory"])

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
            .prefetch_related("orderitem_set__product", "orderitem_set__variant__attributes__attribute")
        )


class CancelOrderView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        try:
            order = (
                Order.objects.select_for_update()
                .prefetch_related("orderitem_set__product", "orderitem_set__variant")
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
            if item.variant_id:
                variant = ProductVariant.objects.select_for_update().filter(pk=item.variant_id).first()
                if variant:
                    variant.inventory += item.quantity
                    variant.save(update_fields=["inventory"])
            else:
                product = Product.objects.select_for_update().filter(pk=item.product_id).first()
                if product:
                    product.inventory += item.quantity
                    product.save(update_fields=["inventory"])

        order.status = Order.Status.CANCELLED
        order.save(update_fields=["status", "updated_at"])
        return Response(OrderSerializer(order, context={"request": request}).data)


class SimulateOrderPaymentView(APIView):
    """Development-only fake payment to exercise the paid-order sales ranking."""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        if not settings.DEBUG:
            from django.http import Http404
            raise Http404

        try:
            order = Order.objects.select_for_update().get(pk=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "سفارش پیدا نشد."}, status=status.HTTP_404_NOT_FOUND)

        if order.is_paid:
            return Response(
                {"detail": "این سفارش قبلاً پرداخت شده است."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order.status != Order.Status.PENDING:
            return Response(
                {"detail": "فقط سفارش در انتظار پرداخت قابل پرداخت آزمایشی است."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order.expires_at and order.expires_at <= timezone.now():
            return Response(
                {"detail": "مهلت سفارش تمام شده است؛ سفارش جدید ثبت کنید."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.is_paid = True
        order.status = Order.Status.CONFIRMED
        order.pay_date = timezone.localdate()
        order.save(update_fields=["is_paid", "status", "pay_date", "updated_at"])
        return Response(OrderSerializer(order, context={"request": request}).data)
