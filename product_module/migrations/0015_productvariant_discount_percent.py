from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("product_module", "0014_remove_legacy_product_stock_price")]

    operations = [
        migrations.AddField(
            model_name="productvariant",
            name="discount_percent",
            field=models.PositiveSmallIntegerField(default=0, help_text="عدد بین ۰ تا ۱۰۰", verbose_name="تخفیف درصدی"),
        ),
    ]
