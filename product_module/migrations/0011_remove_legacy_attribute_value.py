from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("product_module", "0010_backfill_product_attributes"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="product",
            name="attributes",
        ),
        migrations.DeleteModel(
            name="AttributeValue",
        ),
    ]
