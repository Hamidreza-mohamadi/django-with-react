from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("product_module", "0007_productvisit_viewed_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="productvisit",
            name="visitor_key",
            field=models.CharField(
                blank=True,
                db_index=True,
                default="",
                max_length=64,
                verbose_name="شناسه بازدیدکننده",
            ),
        ),
    ]
