from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        ("product_module", "0006_product_favorited_by"),
    ]

    operations = [
        migrations.AddField(
            model_name="productvisit",
            name="viewed_at",
            field=models.DateTimeField(
                db_index=True,
                default=django.utils.timezone.now,
                verbose_name="زمان بازدید",
            ),
        ),
    ]
