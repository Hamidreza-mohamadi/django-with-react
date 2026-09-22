from account_module.models import User
from django.db import models

# Create your models here.

class ArticleCategory(models.Model):
    parent = models.ForeignKey('ArticleCategory', on_delete=models.CASCADE, verbose_name="دسته بندی پدر", blank=True, null=True)
    title = models.CharField(max_length=80, verbose_name="نام دسته بندی")
    image = models.ImageField(upload_to='images/categories', verbose_name="تصویر کتگوری", blank=True, null=True)
    slug = models.CharField(max_length=80, verbose_name='آدرس دسته بندی')
    about = models.TextField(max_length=300, blank=True, verbose_name='توضیحات')
    is_active = models.BooleanField(default=True, verbose_name="فعال/غیرفعال")

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "دسته بندی"
        verbose_name_plural = "دسته بندی ها"


class Article (models.Model):
    title = models.CharField(max_length=80, verbose_name='تیتر مقاله')
    author = models.ForeignKey(User, verbose_name='نویسنده', on_delete=models.PROTECT, blank=True, null=True, )
    content = models.TextField(verbose_name="متن مقاله", blank=True)
    short_description = models.TextField(verbose_name="توضیح کوتاه", blank=True)
    pub_date = models.DateTimeField(verbose_name="تاریخ انتشار", auto_now_add=True)
    category = models.ManyToManyField(ArticleCategory, verbose_name="دسته بندی", blank=True)
    image = models.ImageField(verbose_name="تصویر مقاله", upload_to='images/articles/', blank=True)
    is_published = models.BooleanField(verbose_name="انتشار یافتن", default=True)
    slug = models.SlugField(max_length=150, default="", unique=True, null=False, blank=True, db_index=True,
                            verbose_name='عنوان در url')

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "مقاله"
        verbose_name_plural = "مقاله ها"


class ArticleComment(models.Model):
    article = models.ForeignKey(Article, verbose_name="مقاله", on_delete=models.CASCADE)
    user = models.ForeignKey(User, verbose_name='کاربر', on_delete=models.CASCADE)
    text = models.TextField(max_length=500, verbose_name="متن کامنت", blank=True, null=True)
    create_date = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ارسال کامنت")
    is_approved = models.BooleanField(default=True, verbose_name='مورد تایید')
    parent = models.ForeignKey('ArticleComment', verbose_name='کامنت والد', null=True, blank=True,
                               related_name='children', on_delete=models.CASCADE)

    def __str__(self):
        return self.user.username

    class Meta:
        verbose_name = "کامنت"
        verbose_name_plural = "کامنت ها"

