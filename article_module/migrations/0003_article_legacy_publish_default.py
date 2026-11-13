from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("article_module", "0002_article_workflow_and_seo"),
    ]

    operations = [
        migrations.AlterField(
            model_name="article",
            name="is_published",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="فیلد سازگاری با نسخه قبلی؛ وضعیت اصلی انتشار، فیلد وضعیت است.",
                verbose_name="انتشار یافته (سازگاری قدیمی)",
            ),
        ),
    ]
