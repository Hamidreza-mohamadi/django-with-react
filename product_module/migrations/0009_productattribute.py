from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [("product_module", "0008_productvisit_visitor_key")]
    operations = [
        migrations.CreateModel(
            name="ProductAttribute",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("value", models.CharField(blank=True, default="", max_length=300, verbose_name="مقدار ویژگی")),
                ("attribute", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="product_values", to="product_module.attribute")),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attribute_values", to="product_module.product")),
            ],
            options={"verbose_name": "ویژگی محصول", "verbose_name_plural": "ویژگی‌های محصولات"},
        ),
        migrations.AddConstraint(model_name="productattribute", constraint=models.UniqueConstraint(fields=("product", "attribute"), name="unique_product_attribute_value")),
    ]
