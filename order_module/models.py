from django.db import models
from account_module.models import User
from product_module.models import Product, ProductVariant


# Create your models here.


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "در انتظار پرداخت"
        CONFIRMED = "confirmed", "تأیید شده"
        PROCESSING = "processing", "در حال آماده‌سازی"
        SHIPPED = "shipped", "ارسال شده"
        DELIVERED = "delivered", "تحویل شده"
        CANCELLED = "cancelled", "لغو شده"

    user = models.ForeignKey(User, on_delete=models.PROTECT, verbose_name="کاربر")
    pay_date = models.DateField(verbose_name="تاریخ پرداخت", null=True, blank=True)
    is_paid = models.BooleanField(verbose_name="پرداخت شده", default=False)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, verbose_name="وضعیت سفارش")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ثبت")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخرین تغییر")
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name="مهلت پرداخت")

    def total_net_price(self):
        total_amount = 0
        for item in self.orderitem_set.all():
            total_amount += item.item_total_price()
        return total_amount

    def calculate_total_price(self):
        total_amount = 0
        try:
            address = self.postaladdress
        except PostalAddress.DoesNotExist:
            address = None
        if address and address.shipping_cost:
            total_amount += address.shipping_cost
        for item in self.orderitem_set.all():
            total_amount += item.item_total_price()
        return total_amount

    def __str__(self):
        return str(self.user)

    class Meta:
        verbose_name = "سفارش"
        verbose_name_plural = "سفارش‌ها"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, verbose_name="سبد خرید")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, verbose_name="محصول")
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, null=True, blank=True, related_name="order_items", verbose_name="تنوع خریداری‌شده")
    quantity = models.PositiveIntegerField(verbose_name="تعداد", default=1)
    unit_price = models.PositiveIntegerField(verbose_name="قیمت واحد هنگام سفارش", null=True, blank=True)
    final_price = models.IntegerField(verbose_name="مبلغ کل ردیف سفارش", null=True, blank=True)
    final_discount = models.IntegerField(verbose_name="مبلغ تخفیف نهایی", default=0)

    def allowance_applied(self):
        allowance_amount = 0
        if self.allowance_set.exists():
            for discount in self.allowance_set.all():
                allowance_amount += discount.amount
        return allowance_amount

    def item_total_price(self):
        if self.final_price is not None:
            return max(0, self.final_price)
        else:
            unit_price = self.product.current_price if self.product.current_price is not None else self.product.price
            return max(0, unit_price * self.quantity - self.allowance_applied())

    def __str__(self):
        return str(self.product)

    class Meta:
        verbose_name = "خرید محصول"
        verbose_name_plural = "خریدهای محصول"


class PostalAddress(models.Model):
    province = models.CharField(max_length=200, verbose_name="استان", blank=True)
    city = models.CharField(max_length=200, verbose_name="شهر")
    postal_code = models.CharField(max_length=20, verbose_name="کد پستی")
    exact_address = models.CharField(max_length=200, verbose_name="آدرس دقیق")
    phone = models.CharField(max_length=20, verbose_name="شماره تماس")
    order = models.OneToOneField(Order, on_delete=models.SET_NULL, verbose_name="سبد خرید", null=True, blank=True)
    shipping_cost = models.IntegerField(verbose_name="هزینه ارسال", blank=True, null=True, default=40000)

    class Meta:
        verbose_name = "آدرس پستی"
        verbose_name_plural = "آدرس های پستی"


class Allowance(models.Model):
    title = models.CharField(max_length=200, verbose_name="بن خرید", blank=True,null=True)
    code = models.CharField(max_length=20, unique=True, verbose_name="کد بن خرید")
    amount = models.IntegerField(verbose_name="مبلغ", default=0)
    valid_from = models.DateTimeField(verbose_name="اعتبار از")
    valid_until = models.DateTimeField(verbose_name="اعتبار تا")
    is_active = models.BooleanField(default=True, verbose_name="فعال")
    order_item = models.ManyToManyField(OrderItem, verbose_name="خرید محصول", null=True, blank=True)
    product = models.ManyToManyField(Product, verbose_name="فقط این محصولات", null=True, blank=True)

    def __str__(self):
        if self.title:
            return self.title
        else:
            return self.code

    class Meta:
        verbose_name = "بن خرید"
        verbose_name_plural = "بن های خرید"