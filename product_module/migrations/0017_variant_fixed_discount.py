from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("product_module", "0016_productvariant_sku_help_text")]

    operations = [
        migrations.RemoveField(model_name="productvariant", name="discount_percent"),
        migrations.AddField(
            model_name="productvariant",
            name="discounted",
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="product_module.discount", verbose_name="قیمت آف خورده"),
        ),
    ]
