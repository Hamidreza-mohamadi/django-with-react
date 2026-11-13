from django.db import transaction
from django.utils import timezone

from product_module.models import ProductVariant
from .models import Order, OrderStatusHistory


def expire_order_if_due(order_id, *, now=None):
    """
    Atomically expire one overdue unpaid order and restore its reserved stock once.
    Returns True only when this call performed the transition.
    """
    now = now or timezone.now()
    with transaction.atomic():
        order = (
            Order.objects.select_for_update()
            .filter(
                pk=order_id,
                status=Order.Status.PENDING,
                is_paid=False,
                expires_at__isnull=False,
                expires_at__lte=now,
            )
            .first()
        )
        if order is None:
            return False

        items = list(order.orderitem_set.all().order_by("variant_id", "id"))
        variant_ids = sorted({item.variant_id for item in items if item.variant_id})
        variants = {
            variant.pk: variant
            for variant in ProductVariant.objects.select_for_update()
            .filter(pk__in=variant_ids)
            .order_by("pk")
        }

        for item in items:
            variant = variants.get(item.variant_id)
            if variant is not None:
                variant.inventory += item.quantity
                variant.save(update_fields=["inventory"])

        previous_status = order.status
        order.status = Order.Status.EXPIRED
        order.save(update_fields=["status", "updated_at"])
        OrderStatusHistory.objects.create(
            order=order,
            from_status=previous_status,
            to_status=Order.Status.EXPIRED,
            changed_by=None,
            note="مهلت پرداخت سفارش به پایان رسید؛ موجودی رزروشده آزاد شد.",
        )
        return True


def expire_due_orders(*, now=None, batch_size=200):
    """Find candidate orders and process each in its own atomic transaction."""
    now = now or timezone.now()
    order_ids = list(
        Order.objects.filter(
            status=Order.Status.PENDING,
            is_paid=False,
            expires_at__isnull=False,
            expires_at__lte=now,
        )
        .order_by("expires_at", "pk")
        .values_list("pk", flat=True)[:batch_size]
    )
    expired_count = 0
    for order_id in order_ids:
        if expire_order_if_due(order_id, now=now):
            expired_count += 1
    return expired_count
