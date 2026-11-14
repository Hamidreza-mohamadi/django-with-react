import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("article_module", "0004_article_approved_status"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="article",
            name="content_json",
            field=models.JSONField(blank=True, null=True, verbose_name="محتوای ساختارمند"),
        ),
        migrations.CreateModel(
            name="ArticleTag",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=50, unique=True, verbose_name="برچسب")),
                ("slug", models.SlugField(blank=True, max_length=60, unique=True)),
                ("is_active", models.BooleanField(default=True, verbose_name="فعال/غیرفعال")),
            ],
            options={"ordering": ["title"], "verbose_name": "برچسب مقاله", "verbose_name_plural": "برچسب‌های مقاله"},
        ),
        migrations.AddField(
            model_name="article",
            name="tags",
            field=models.ManyToManyField(blank=True, related_name="articles", to="article_module.articletag", verbose_name="برچسب‌ها"),
        ),
        migrations.CreateModel(
            name="ArticleImage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to="images/articles/content/%Y/%m/")),
                ("alt_text", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("article", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="content_images", to="article_module.article")),
                ("uploaded_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="article_images", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["created_at", "id"]},
        ),
        migrations.AlterField(
            model_name="articlecomment",
            name="text",
            field=models.TextField(max_length=2000, verbose_name="متن دیدگاه"),
        ),
    ]
