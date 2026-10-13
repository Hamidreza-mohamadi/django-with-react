from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from order_module.models import Order
from product_module.models import Product


class Command(BaseCommand):
    help = "Cancel expired unpaid orders and release their reserved stock."

    def handle(self, *args, **options):
        now = timezone.now()
        expired_ids = list(
            Order.objects.filter(
                status=Order.Status.PENDING,
                is_paid=False,
                expires_at__isnull=False,
                expires_at__lte=now,
            ).values_list("id", flat=True)
        )
        released = 0

        for order_id in expired_ids:
            with transaction.atomic():
                try:
                    order = Order.objects.select_for_update().get(pk=order_id)
                except Order.DoesNotExist:
                    continue

                if (
                    order.status != Order.Status.PENDING
                    or order.is_paid
                    or not order.expires_at
                    or order.expires_at > timezone.now()
                ):
                    continue

                items = list(order.orderitem_set.all())
                product_ids = sorted({item.product_id for item in items})
                products = {
                    product.pk: product
                    for product in Product.objects.select_for_update()
                    .filter(pk__in=product_ids)
                    .order_by("pk")
                }

                for item in items:
                    product = products.get(item.product_id)
                    if product:
                        product.inventory += item.quantity
                        product.save(update_fields=["inventory"])

                order.status = Order.Status.CANCELLED
                order.save(update_fields=["status", "updated_at"])
                released += 1

        self.stdout.write(self.style.SUCCESS(f"Cancelled {released} expired order(s)."))
