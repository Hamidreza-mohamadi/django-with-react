import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("order_module", "0002_order_status_timestamps"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("product_module", "0005_alter_attribute_options_category_attributes_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="order",
            name="user",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                to=settings.AUTH_USER_MODEL,
                verbose_name="کاربر",
            ),
        ),
        migrations.AlterField(
            model_name="orderitem",
            name="product",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                to="product_module.product",
                verbose_name="محصول",
            ),
        ),
    ]
