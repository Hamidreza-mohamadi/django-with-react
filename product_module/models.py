from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from account_module.models import User

from django.urls import reverse


# Create your models here.


class Attribute(models.Model):
    title = models.CharField(max_length=80, verbose_name="نام ویژگی")

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = 'ویژگی محصول'
        verbose_name_plural = 'ویژگیهای محصولات'


class AttributeValue(models.Model):
    """A reusable, normalized value belonging to a single attribute."""

    attribute = models.ForeignKey(
        Attribute, on_delete=models.CASCADE, related_name="values"
    )
    value = models.CharField(max_length=300, verbose_name="مقدار ویژگی")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["attribute", "value"],
                name="unique_attribute_value_text",
            )
        ]
        ordering = ["attribute__title", "value"]
        verbose_name = "مقدار ویژگی"
        verbose_name_plural = "مقادیر ویژگی‌ها"

    def save(self, *args, **kwargs):
        self.value = self.value.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.attribute.title}: {self.value}"


class Category(models.Model):
    parent = models.ForeignKey('Category', on_delete=models.CASCADE, verbose_name="دسته بندی پدر", blank=True, null=True)
    title = models.CharField(max_length=80, verbose_name="نام دسته بندی")
    image = models.ImageField(upload_to='images/categories', verbose_name="تصویر کتگوری", blank=True, null=True)
    slug = models.CharField(max_length=80, verbose_name='آدرس دسته بندی')
    about = models.TextField(max_length=300, blank=True, verbose_name='توضیحات')
    is_active = models.BooleanField(default=True, verbose_name="فعال/غیرفعال")
    attributes = models.ManyToManyField(Attribute, verbose_name='ویژگی ها', blank=True) #todo vaghti cat mahsool entekhab shod attribute haye cat khodkar be mahsool add shavad

    def __str__(self):
        return self.title

    class Meta:
        verbose_name_plural = "دسته بندی ها"
        verbose_name = "دسته بندی"


class Brand(models.Model):
    title = models.CharField(max_length=80, verbose_name="نام برند")
    url = models.CharField(max_length=80, verbose_name="آدرس برند")
    image = models.ImageField(upload_to='images/brands', verbose_name="تصویر برند", blank=True, null=True)
    about = models.TextField(max_length=300, blank=True, verbose_name='توضیحات')
    is_active = models.BooleanField(default=True, verbose_name="فعال/فعال نبودن")

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "برند"
        verbose_name_plural = "برندها"


class Discount(models.Model):
    title = models.CharField(max_length=200, verbose_name="تخفیف", blank=True,null=True)
    amount = models.IntegerField(verbose_name="مبلغ", null=True, blank=True)
    valid_from = models.DateTimeField(verbose_name="اعتبار از")
    valid_until = models.DateTimeField(verbose_name="اعتبار تا")
    is_active = models.BooleanField(default=True, verbose_name="فعال")

    # def __str__(self):
    #     if self.title:
    #         return self.title


class Product(models.Model):
    title = models.CharField(max_length=80, verbose_name='نام محصول')
    discounted = models.OneToOneField(Discount, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='قیمت آف خورده')
    admin = models.ForeignKey(User, verbose_name='ادمین', on_delete=models.PROTECT,blank=True, null=True)
    description = models.TextField(max_length=300, blank=True, verbose_name='توضیحات محصول')
    category = models.ManyToManyField(Category, max_length=80, blank=True, verbose_name='دسته بندی')
    brand = models.ForeignKey(Brand, on_delete=models.PROTECT, max_length=80, blank=True, null=True, verbose_name='برند')  #
    image = models.ImageField(blank=True, verbose_name='تصاویر محصول', upload_to='images/products')
    slug = models.SlugField(max_length=150, default="", unique=True, null=False, blank=True, db_index=True, verbose_name='عنوان در url')
    is_active = models.BooleanField(default=True, verbose_name='فعال یا غیرفعال')
    created_date = models.DateTimeField(auto_now_add=True)
    rating = models.IntegerField(verbose_name='امتیاز محصول', blank=True, null=True)
    favorited_by = models.ManyToManyField(User, related_name="favorite_products", blank=True, verbose_name="علاقه‌مندان")


    # @property
    # def current_price(self):
    #     if (self.discounted and self.discounted.amount and self.discounted.is_active is True and
    #             self.discounted.valid_from <= timezone.now() <= self.discounted.valid_until):
    #         return self.discounted.amount
    #     return self.price

    def get_absolute_url(self):
        return reverse('product-detail', args=[self.slug])

    # def save(self, *args, **kwargs):
    # #     self.slug = slugify(self.title)
    #     for category in self.category.all():
    #         parents = []
    #         while category.parent:
    #             parents.append(category.parent)
    #             print(category.parent.title)
    #             category = category.parent
    #         self.category.add(*parents)
    #     super().save(*args, **kwargs)


    def __str__(self):
        return self.title

    class Meta:
        verbose_name = 'محصول'
        verbose_name_plural = 'محصولات'


class ProductVariant(models.Model):
    """A sellable SKU for a catalog product, with its own price, stock and attributes."""

    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="variants", verbose_name="محصول"
    )
    sku = models.CharField(max_length=64, unique=True, blank=True, verbose_name="شناسه کالا")
    price = models.PositiveIntegerField(verbose_name="قیمت")
    discount_percent = models.PositiveSmallIntegerField(default=0, verbose_name="تخفیف درصدی", help_text="عدد بین ۰ تا ۱۰۰")
    inventory = models.PositiveIntegerField(default=0, verbose_name="موجودی انبار")
    attributes = models.ManyToManyField(
        AttributeValue, blank=True, related_name="product_variants", verbose_name="ویژگی‌های ترکیب"
    )
    is_active = models.BooleanField(default=True, verbose_name="فعال")

    class Meta:
        ordering = ["id"]
        verbose_name = "تنوع محصول"
        verbose_name_plural = "تنوع‌های محصول"

    @property
    def effective_price(self):
        now = timezone.now()
        if 0 < self.discount_percent <= 100:
            return self.price * (100 - self.discount_percent) // 100
        # Backward compatibility for legacy product-level fixed-price discounts.
        discount = getattr(self.product, "discounted", None)
        if discount and discount.is_active and discount.amount is not None and discount.valid_from <= now <= discount.valid_until and 0 <= discount.amount < self.price:
            return discount.amount
        return self.price

    def clean(self):
        super().clean()
        if self.discount_percent > 100:
            raise ValidationError({"discount_percent": "درصد تخفیف باید بین ۰ تا ۱۰۰ باشد."})
        if self.pk:
            values = list(self.attributes.select_related("attribute").all())
        else:
            values = list(getattr(self, "_pending_attribute_values", []))
        attribute_ids = [value.attribute_id for value in values]
        if len(attribute_ids) != len(set(attribute_ids)):
            raise ValidationError("برای هر ویژگی در یک تنوع فقط یک مقدار انتخاب کنید.")

        if self.product_id and values:
            allowed_attribute_ids = set(
                self.product.category.values_list("attributes__id", flat=True)
            )
            allowed_attribute_ids.discard(None)
            invalid_attribute_ids = set(attribute_ids) - allowed_attribute_ids
            if invalid_attribute_ids:
                raise ValidationError(
                    "ویژگی‌های انتخاب‌شده در دسته‌بندی‌های این محصول تعریف نشده‌اند."
                )

        if self.pk and self.product_id:
            selected_value_ids = set(self.attributes.values_list("pk", flat=True))
            for other in self.product.variants.exclude(pk=self.pk).prefetch_related("attributes"):
                other_value_ids = set(other.attributes.values_list("pk", flat=True))
                if selected_value_ids == other_value_ids:
                    raise ValidationError(
                        "این ترکیب ویژگی‌ها قبلاً برای همین محصول تعریف شده است."
                    )

    def save(self, *args, **kwargs):
        if not self.sku:
            import uuid
            self.sku = f"SKU-{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        values = ", ".join(
            f"{value.attribute.title}: {value.value}"
            for value in self.attributes.select_related("attribute").all()
        )
        return f"{self.product.title} ({values or self.sku})"


class ProductVisit(models.Model):
    visitor_key = models.CharField(max_length=64, blank=True, default="", db_index=True, verbose_name="شناسه بازدیدکننده")
    viewed_at = models.DateTimeField(default=timezone.now, db_index=True, verbose_name='زمان بازدید')
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, verbose_name='کاربر')
    ip_address = models.CharField(verbose_name='ip', max_length=100)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, verbose_name='محصول')

    def __str__(self):
        return self.ip_address

    class Meta:
        verbose_name = 'بازدید'
        verbose_name_plural = 'بازدیدها'


class ProductGallery(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, verbose_name='محصول')
    image = models.ImageField(upload_to='images/product_galleries', verbose_name='تصویر')

    class Meta:
        verbose_name = 'تصویر گالری'
        verbose_name_plural = 'تصاویر گالری'


class ProductComment(models.Model):
    product = models.ForeignKey(Product, verbose_name="محصول", on_delete=models.CASCADE)
    user = models.ForeignKey(User, verbose_name='کاربر', on_delete=models.CASCADE)
    text = models.TextField(max_length=500, verbose_name="متن کامنت", blank=True, null=True)
    create_date = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ارسال کامنت")
    is_approved = models.BooleanField(default=True, verbose_name='مورد تایید')
    parent = models.ForeignKey('ProductComment', verbose_name='کامنت والد', null=True, blank=True,
                               related_name='children', on_delete=models.CASCADE)
    rate = models.IntegerField(verbose_name='نمره به محصول', null=True, blank=True)

    def __str__(self):
        return self.user.username

    class Meta:
        verbose_name = "کامنت"
        verbose_name_plural = "کامنت ها"

