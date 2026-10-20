from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("product_module", "0015_productvariant_discount_percent")]

    operations = [
        migrations.AlterField(
            model_name="productvariant",
            name="sku",
            field=models.CharField(blank=True, help_text="کد یکتای انبار؛ در صورت خالی‌بودن خودکار ساخته می‌شود.", max_length=64, unique=True, verbose_name="شناسه کالا"),
        ),
    ]
