from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("article_module", "0003_article_legacy_publish_default"),
    ]

    operations = [
        migrations.AlterField(
            model_name="article",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "پیش‌نویس"),
                    ("review", "در انتظار بررسی"),
                    ("approved", "تأییدشده برای انتشار"),
                    ("published", "منتشرشده"),
                    ("archived", "بایگانی‌شده"),
                ],
                db_index=True,
                default="draft",
                max_length=20,
                verbose_name="وضعیت انتشار",
            ),
        ),
    ]
