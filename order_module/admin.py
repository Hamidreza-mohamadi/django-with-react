from django.contrib import admin

from .models import Allowance, Order, OrderItem, PostalAddress


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product", "quantity", "final_price", "final_discount")
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
    readonly_fields = ("created_at", "updated_at", "pay_date", "expires_at")
    inlines = (OrderItemInline, PostalAddressInline)
    ordering = ("-created_at",)


@admin.register(Allowance)
class AllowanceAdmin(admin.ModelAdmin):
    list_display = ("code", "title", "amount", "is_active", "valid_from", "valid_until")
    list_filter = ("is_active",)
    search_fields = ("code", "title")
