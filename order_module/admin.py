from django.contrib import admin, messages
from django.db import transaction
from django.utils import timezone

from product_module.models import Product
from .models import Allowance, Order, OrderItem, PostalAddress


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product", "quantity", "unit_price", "final_price", "final_discount")
    can_delete = False


class PostalAddressInline(admin.StackedInline):
    model = PostalAddress
    extra = 0
    max_num = 1


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "is_paid", "created_at", "expires_at")
    list_filter = ("status", "is_paid", "created_at")
    search_fields = ("id", "user__username", "user__email")
    readonly_fields = ("created_at", "updated_at", "pay_date", "expires_at", "status", "is_paid")
    inlines = (OrderItemInline, PostalAddressInline)
    ordering = ("-created_at",)
    actions = ("cancel_unpaid_orders", "mark_confirmed", "mark_processing", "mark_shipped", "mark_delivered")

    @admin.action(description="لغو سفارش‌های پرداخت‌نشده و بازگرداندن موجودی")
    def cancel_unpaid_orders(self, request, queryset):
        cancelled = 0
        with transaction.atomic():
            for order in queryset.select_for_update().filter(
                status=Order.Status.PENDING, is_paid=False
            ):
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
                cancelled += 1
        self.message_user(request, f"{cancelled} سفارش لغو شد و موجودی بازگشت.", messages.SUCCESS)

    def _advance_paid_orders(self, request, queryset, old_status, new_status, label):
        updated = queryset.filter(is_paid=True, status=old_status).update(
            status=new_status, updated_at=timezone.now()
        )
        self.message_user(request, f"{updated} سفارش {label}.", messages.SUCCESS)

    @admin.action(description="تأیید سفارش‌های پرداخت‌شده")
    def mark_confirmed(self, request, queryset):
        self._advance_paid_orders(request, queryset, Order.Status.PENDING, Order.Status.CONFIRMED, "تأیید شد")

    @admin.action(description="شروع آماده‌سازی سفارش‌ها")
    def mark_processing(self, request, queryset):
        self._advance_paid_orders(request, queryset, Order.Status.CONFIRMED, Order.Status.PROCESSING, "در حال آماده‌سازی قرار گرفت")

    @admin.action(description="ثبت ارسال سفارش‌ها")
    def mark_shipped(self, request, queryset):
        self._advance_paid_orders(request, queryset, Order.Status.PROCESSING, Order.Status.SHIPPED, "ارسال شد")

    @admin.action(description="ثبت تحویل سفارش‌ها")
    def mark_delivered(self, request, queryset):
        self._advance_paid_orders(request, queryset, Order.Status.SHIPPED, Order.Status.DELIVERED, "تحویل شد")


@admin.register(Allowance)
class AllowanceAdmin(admin.ModelAdmin):
    list_display = ("code", "title", "amount", "is_active", "valid_from", "valid_until")
    list_filter = ("is_active",)
    search_fields = ("code", "title")
