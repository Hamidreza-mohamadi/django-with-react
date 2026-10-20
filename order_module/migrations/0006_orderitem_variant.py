from django.db import migrations, models
import django.db.models.deletion


def attach_legacy_order_items(apps, schema_editor):
    OrderItem = apps.get_model("order_module", "OrderItem")
    ProductVariant = apps.get_model("product_module", "ProductVariant")
    db_alias = schema_editor.connection.alias

    for item in OrderItem.objects.using(db_alias).filter(variant__isnull=True).iterator():
        variant = (
            ProductVariant.objects.using(db_alias)
            .filter(product_id=item.product_id)
            .order_by("id")
            .first()
        )
        if variant:
            item.variant_id = variant.pk
            item.save(update_fields=["variant"], using=db_alias)


class Migration(migrations.Migration):
    dependencies = [
        ("product_module", "0013_productvariant"),
        ("order_module", "0005_orderitem_unit_price"),
    ]

    operations = [
        migrations.AddField(
            model_name="orderitem",
            name="variant",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="order_items", to="product_module.productvariant", verbose_name="تنوع خریداری‌شده"),
        ),
        migrations.RunPython(attach_legacy_order_items, migrations.RunPython.noop),
    ]
