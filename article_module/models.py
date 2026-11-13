from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


def _unique_slug(instance, source, *, queryset, fallback):
    base = slugify(source, allow_unicode=True) or fallback
    candidate = base[:140]
    suffix = 2
    while queryset.exclude(pk=instance.pk).filter(slug=candidate).exists():
        tail = f"-{suffix}"
        candidate = f"{base[:150 - len(tail)]}{tail}"
        suffix += 1
    return candidate


class ArticleCategory(models.Model):
    parent = models.ForeignKey(
        "self", on_delete=models.PROTECT, verbose_name="دسته‌بندی والد",
        blank=True, null=True, related_name="children",
    )
    title = models.CharField(max_length=80, verbose_name="نام دسته‌بندی")
    image = models.ImageField(upload_to="images/categories", verbose_name="تصویر دسته‌بندی", blank=True, null=True)
    slug = models.SlugField(max_length=80, unique=True, blank=True, verbose_name="آدرس دسته‌بندی")
    about = models.TextField(max_length=300, blank=True, verbose_name="توضیحات")
    is_active = models.BooleanField(default=True, verbose_name="فعال/غیرفعال")

    class Meta:
        verbose_name = "دسته‌بندی"
        verbose_name_plural = "دسته‌بندی‌ها"
        ordering = ["title"]

    def clean(self):
        super().clean()
        ancestor = self.parent
        visited = set()
        while ancestor is not None:
            if ancestor.pk == self.pk:
                raise ValidationError({"parent": "یک دسته‌بندی نمی‌تواند زیرمجموعه خودش یا نوادگانش باشد."})
            if ancestor.pk in visited:
                raise ValidationError({"parent": "در زنجیره والدین دسته‌بندی چرخه وجود دارد."})
            visited.add(ancestor.pk)
            ancestor = ancestor.parent

    def save(self, *args, **kwargs):
        if self.parent_id:
            self.clean()
        if not self.slug:
            self.slug = _unique_slug(
                self, self.title,
                queryset=type(self).objects.all(),
                fallback="category",
            )[:80]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Article(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "پیش‌نویس"
        REVIEW = "review", "در انتظار بررسی"
        PUBLISHED = "published", "منتشرشده"
        ARCHIVED = "archived", "بایگانی‌شده"

    title = models.CharField(max_length=80, verbose_name="تیتر مقاله")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="نویسنده",
        on_delete=models.PROTECT, blank=True, null=True,
        related_name="articles",
    )
    content = models.TextField(verbose_name="متن مقاله", blank=True)
    short_description = models.TextField(verbose_name="توضیح کوتاه", blank=True)
    pub_date = models.DateTimeField(verbose_name="تاریخ انتشار قدیمی", auto_now_add=True)
    category = models.ManyToManyField(ArticleCategory, verbose_name="دسته‌بندی", blank=True, related_name="articles")
    image = models.ImageField(verbose_name="تصویر مقاله", upload_to="images/articles/", blank=True)
    image_alt = models.CharField(max_length=255, blank=True, verbose_name="متن جایگزین تصویر")
    slug = models.SlugField(max_length=150, default="", unique=True, blank=True, verbose_name="عنوان در URL")

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT,
        db_index=True, verbose_name="وضعیت انتشار",
    )
    is_published = models.BooleanField(
        default=False, db_index=True, verbose_name="انتشار یافته (سازگاری قدیمی)",
        help_text="فیلد سازگاری با نسخه قبلی؛ وضعیت اصلی انتشار، فیلد وضعیت است.",
    )
    scheduled_at = models.DateTimeField(null=True, blank=True, db_index=True, verbose_name="زمان انتشار زمان‌بندی‌شده")
    published_at = models.DateTimeField(null=True, blank=True, db_index=True, verbose_name="زمان انتشار")
    created_at = models.DateTimeField(default=timezone.now, editable=False, verbose_name="زمان ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخرین ویرایش")
    meta_title = models.CharField(max_length=70, blank=True, verbose_name="عنوان سئو")
    meta_description = models.CharField(max_length=160, blank=True, verbose_name="توضیحات سئو")

    class Meta:
        verbose_name = "مقاله"
        verbose_name_plural = "مقاله‌ها"
        ordering = ["-published_at", "-id"]
        permissions = [
            ("publish_article", "Can publish or schedule article"),
            ("review_article", "Can review submitted articles"),
        ]

    def clean(self):
        super().clean()
        if self.status == self.Status.PUBLISHED and self.scheduled_at and self.scheduled_at > timezone.now():
            raise ValidationError({"scheduled_at": "مقاله زمان‌بندی‌شده هنوز نباید منتشر شود."})
        if self.status != self.Status.PUBLISHED and self.published_at and self.status != self.Status.ARCHIVED:
            raise ValidationError({"published_at": "زمان انتشار فقط برای مقاله منتشرشده یا بایگانی‌شده مجاز است."})

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = _unique_slug(
                self, self.title,
                queryset=type(self).objects.all(),
                fallback="article",
            )
        if self.status == self.Status.PUBLISHED:
            self.is_published = True
            if self.published_at is None:
                self.published_at = timezone.now()
            self.scheduled_at = None
        else:
            self.is_published = False
            if self.status != self.Status.ARCHIVED:
                self.published_at = None
        super().save(*args, **kwargs)

    def publish(self, *, at=None):
        self.status = self.Status.PUBLISHED
        self.published_at = at or timezone.now()
        self.scheduled_at = None
        self.save()

    def __str__(self):
        return self.title


class ArticleComment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "در انتظار تأیید"
        APPROVED = "approved", "تأییدشده"
        REJECTED = "rejected", "ردشده"

    article = models.ForeignKey(Article, verbose_name="مقاله", on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name="کاربر", on_delete=models.CASCADE)
    text = models.TextField(max_length=500, verbose_name="متن دیدگاه")
    create_date = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ارسال دیدگاه")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True, verbose_name="وضعیت")
    parent = models.ForeignKey(
        "self", verbose_name="دیدگاه والد", null=True, blank=True,
        related_name="children", on_delete=models.CASCADE,
    )

    class Meta:
        verbose_name = "دیدگاه"
        verbose_name_plural = "دیدگاه‌ها"
        ordering = ["create_date", "id"]

    def clean(self):
        super().clean()
        if self.parent_id:
            if self.parent.article_id != self.article_id:
                raise ValidationError({"parent": "پاسخ باید متعلق به همان مقاله باشد."})
            if self.parent_id == self.pk:
                raise ValidationError({"parent": "یک دیدگاه نمی‌تواند والد خودش باشد."})

    def __str__(self):
        return f"{self.user} - {self.article}"
