from django.db import models
from django.utils import timezone

from account_module.models import User

from django.urls import reverse
from django.utils.text import slugify


# Create your models here.


class Attribute(models.Model):
    title = models.CharField(max_length=80, verbose_name="نام ویژگی")

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = 'ویژگی محصول'
        verbose_name_plural = 'ویژگیهای محصولات'


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


class AttributeValue(models.Model):
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE, verbose_name="ویژگی محصول")
    value = models.CharField(max_length=300, verbose_name="محتوای ویژگی")

    def __str__(self):
        return self.attribute.title + ' : ' + self.value

    class Meta:
        verbose_name = 'محتوای ویژگی محصول'
        verbose_name_plural = 'محتوای ویژگیهای محصولات'


class Product(models.Model):
    title = models.CharField(max_length=80, verbose_name='نام محصول')
    price = models.IntegerField(blank=True, verbose_name='قیمت محصول')
    current_price = models.IntegerField(verbose_name="قیمت نهایی", blank=True, null=True)
    discounted = models.OneToOneField(Discount, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='قیمت آف خورده')
    admin = models.ForeignKey(User, verbose_name='ادمین', on_delete=models.PROTECT,blank=True, null=True)
    description = models.TextField(max_length=300, blank=True, verbose_name='توضیحات محصول')
    category = models.ManyToManyField(Category, max_length=80, blank=True, verbose_name='دسته بندی')
    brand = models.ForeignKey(Brand, on_delete=models.PROTECT, max_length=80, blank=True, null=True, verbose_name='برند')  #
    image = models.ImageField(blank=True, verbose_name='تصاویر محصول', upload_to='images/products')
    inventory = models.IntegerField(verbose_name='موجودی در انبار', default=0)  # فیلد موجودی انبار
    slug = models.SlugField(max_length=150, default="", unique=True, null=False, blank=True, db_index=True, verbose_name='عنوان در url')
    is_active = models.BooleanField(default=True, verbose_name='فعال یا غیرفعال')
    created_date = models.DateTimeField(auto_now_add=True)
    rating = models.IntegerField(verbose_name='امتیاز محصول', blank=True, null=True)
    attributes = models.ManyToManyField(AttributeValue, verbose_name='ویژگی های محصول', blank=True)

    def save(self, *args, **kwargs):
        if (self.discounted and self.discounted.amount and self.discounted.is_active and
                self.discounted.valid_from <= timezone.now() <= self.discounted.valid_until):
            self.current_price = self.discounted.amount
        else:
            self.current_price = self.price
        super().save(*args, **kwargs)

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


class ProductVisit(models.Model):
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
