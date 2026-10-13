from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("product_module", "0005_alter_attribute_options_category_attributes_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="favorited_by",
            field=models.ManyToManyField(
                blank=True,
                related_name="favorite_products",
                to=settings.AUTH_USER_MODEL,
                verbose_name="علاقه‌مندان",
            ),
        ),
    ]
