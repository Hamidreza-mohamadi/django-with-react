import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models
from django.utils.text import slugify


def backfill_article_workflow(apps, schema_editor):
    Article = apps.get_model("article_module", "Article")
    Category = apps.get_model("article_module", "ArticleCategory")
    Comment = apps.get_model("article_module", "ArticleComment")
    db = schema_editor.connection.alias

    used_category_slugs = set()
    for category in Category.objects.using(db).order_by("pk").iterator():
        base = slugify(category.slug or category.title, allow_unicode=True) or f"category-{category.pk}"
        candidate = base[:80]
        suffix = 2
        while candidate in used_category_slugs:
            tail = f"-{suffix}"
            candidate = f"{base[:80-len(tail)]}{tail}"
            suffix += 1
        used_category_slugs.add(candidate)
        Category.objects.using(db).filter(pk=category.pk).update(slug=candidate)

    used_article_slugs = set()
    for article in Article.objects.using(db).order_by("pk").iterator():
        base = slugify(article.slug or article.title, allow_unicode=True) or f"article-{article.pk}"
        candidate = base[:150]
        suffix = 2
        while candidate in used_article_slugs:
            tail = f"-{suffix}"
            candidate = f"{base[:150-len(tail)]}{tail}"
            suffix += 1
        used_article_slugs.add(candidate)
        published = bool(article.is_published)
        Article.objects.using(db).filter(pk=article.pk).update(
            slug=candidate,
            status="published" if published else "draft",
            published_at=article.pub_date if published else None,
            created_at=article.pub_date,
            updated_at=article.pub_date,
        )

    for comment in Comment.objects.using(db).all().iterator():
        Comment.objects.using(db).filter(pk=comment.pk).update(
            status="approved" if comment.is_approved else "pending"
        )


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("article_module", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="article",
            name="status",
            field=models.CharField(choices=[("draft", "پیش‌نویس"), ("review", "در انتظار بررسی"), ("published", "منتشرشده"), ("archived", "بایگانی‌شده")], db_index=True, default="draft", max_length=20, verbose_name="وضعیت انتشار"),
        ),
        migrations.AddField(
            model_name="article",
            name="scheduled_at",
            field=models.DateTimeField(blank=True, db_index=True, null=True, verbose_name="زمان انتشار زمان‌بندی‌شده"),
        ),
        migrations.AddField(
            model_name="article",
            name="published_at",
            field=models.DateTimeField(blank=True, db_index=True, null=True, verbose_name="زمان انتشار"),
        ),
        migrations.AddField(
            model_name="article",
            name="created_at",
            field=models.DateTimeField(default=django.utils.timezone.now, editable=False, verbose_name="زمان ایجاد"),
        ),
        migrations.AddField(
            model_name="article",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, verbose_name="آخرین ویرایش"),
        ),
        migrations.AddField(
            model_name="article",
            name="image_alt",
            field=models.CharField(blank=True, max_length=255, verbose_name="متن جایگزین تصویر"),
        ),
        migrations.AddField(
            model_name="article",
            name="meta_title",
            field=models.CharField(blank=True, max_length=70, verbose_name="عنوان سئو"),
        ),
        migrations.AddField(
            model_name="article",
            name="meta_description",
            field=models.CharField(blank=True, max_length=160, verbose_name="توضیحات سئو"),
        ),
        migrations.AddField(
            model_name="articlecomment",
            name="status",
            field=models.CharField(choices=[("pending", "در انتظار تأیید"), ("approved", "تأییدشده"), ("rejected", "ردشده")], db_index=True, default="pending", max_length=12, verbose_name="وضعیت"),
        ),
        migrations.RunPython(backfill_article_workflow, migrations.RunPython.noop),
        migrations.RemoveField(model_name="articlecomment", name="is_approved"),
        migrations.AlterField(
            model_name="articlecategory",
            name="slug",
            field=models.SlugField(blank=True, max_length=80, unique=True, verbose_name="آدرس دسته‌بندی"),
        ),
        migrations.AlterField(
            model_name="articlecategory",
            name="parent",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="children", to="article_module.articlecategory", verbose_name="دسته‌بندی والد"),
        ),
        migrations.AlterField(
            model_name="article",
            name="slug",
            field=models.SlugField(blank=True, default="", max_length=150, unique=True, verbose_name="عنوان در URL"),
        ),
        migrations.AlterField(
            model_name="article",
            name="category",
            field=models.ManyToManyField(blank=True, related_name="articles", to="article_module.articlecategory", verbose_name="دسته‌بندی"),
        ),
        migrations.AlterField(
            model_name="article",
            name="author",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="articles", to=settings.AUTH_USER_MODEL, verbose_name="نویسنده"),
        ),
        migrations.AlterField(
            model_name="articlecomment",
            name="article",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="comments", to="article_module.article", verbose_name="مقاله"),
        ),
    ]
