from django.db import models
from account_module.models import User
from product_module.models import Product


# Create your models here.


class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="کاربر")
    pay_date = models.DateField(verbose_name="نهایی شده", null=True, blank=True)
    is_paid = models.BooleanField(verbose_name="پرداخت شده", default=False)

    def total_net_price(self):
        total_amount = 0
        for item in self.orderitem_set.all():
            total_amount += item.item_total_price()
        return total_amount

    def calculate_total_price(self):
        total_amount = 0
        if hasattr(self, 'postaladdress'): #aya fieldi be in nam darad
            print('k')
            if self.postaladdress:
                print('j')
                total_amount = self.postaladdress.shipping_cost
        for item in self.orderitem_set.all():
            total_amount += item.item_total_price()
        return total_amount

    def __str__(self):
        return str(self.user)

    class Meta:
        verbose_name = "سبد خرید"
        verbose_name_plural = "سبدهای خرید"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, verbose_name="سبد خرید")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, verbose_name="محصول")
    quantity = models.IntegerField(verbose_name="تعداد", default=1)
    final_price = models.IntegerField(verbose_name="قیمت تمام شده", null=True, blank=True)
    final_discount = models.IntegerField(verbose_name="مبلغ تخفیف نهایی", default=0)

    def allowance_applied(self):
        allowance_amount = 0
        if self.allowance_set.exists():
            for discount in self.allowance_set.all():
                allowance_amount += discount.amount
        return allowance_amount

    def item_total_price(self):
        if self.final_price:
            return self.final_price
        else:
            return self.product.current_price * self.quantity - self.allowance_applied()

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