from django.contrib import admin, messages
from django.db import transaction
from django.utils import timezone

from product_module.models import ProductVariant
from .models import Allowance, Order, OrderItem, PostalAddress, OrderStatusHistory, PaymentEvent


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product", "variant", "quantity", "unit_price", "final_price", "final_discount", "product_name_snapshot", "sku_snapshot", "variant_attributes_snapshot")
    can_delete = False


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    can_delete = False
    readonly_fields = ("from_status", "to_status", "changed_by", "note", "created_at")


class PaymentEventInline(admin.TabularInline):
    model = PaymentEvent
    extra = 0
    can_delete = False
    readonly_fields = ("status", "provider", "reference", "amount", "currency", "raw_response", "created_at")


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
    inlines = (OrderItemInline, PostalAddressInline, OrderStatusHistoryInline, PaymentEventInline)
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
                variant_ids = sorted({item.variant_id for item in items if item.variant_id})
                variants = {
                    variant.pk: variant
                    for variant in ProductVariant.objects.select_for_update()
                    .filter(pk__in=variant_ids)
                    .order_by("pk")
                }
                for item in items:
                    if item.variant_id:
                        variant = variants.get(item.variant_id)
                        if variant:
                            variant.inventory += item.quantity
                            variant.save(update_fields=["inventory"])
                previous_status = order.status
                order.status = Order.Status.CANCELLED
                order.save(update_fields=["status", "updated_at"])
                OrderStatusHistory.objects.create(
                    order=order, from_status=previous_status, to_status=Order.Status.CANCELLED,
                    changed_by=request.user, note="لغو از پنل مدیریت و بازگشت موجودی.",
                )
                cancelled += 1
        self.message_user(request, f"{cancelled} سفارش لغو شد و موجودی بازگشت.", messages.SUCCESS)

    def _advance_paid_orders(self, request, queryset, old_status, new_status, label):
        updated = 0
        with transaction.atomic():
            for order in queryset.select_for_update().filter(is_paid=True, status=old_status):
                previous_status = order.status
                order.status = new_status
                order.save(update_fields=["status", "updated_at"])
                OrderStatusHistory.objects.create(
                    order=order, from_status=previous_status, to_status=new_status,
                    changed_by=request.user, note=f"تغییر وضعیت از پنل مدیریت: {label}.",
                )
                updated += 1
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
