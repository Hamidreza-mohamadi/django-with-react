from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("product_module", "0013_productvariant"),
    ]

    operations = [
        migrations.RemoveField(model_name="product", name="attributes"),
        migrations.RemoveField(model_name="product", name="current_price"),
        migrations.RemoveField(model_name="product", name="inventory"),
        migrations.RemoveField(model_name="product", name="price"),
    ]
