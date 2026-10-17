from django.db import migrations


def backfill_product_attributes(apps, schema_editor):
    Product = apps.get_model("product_module", "Product")
    ProductAttribute = apps.get_model("product_module", "ProductAttribute")
    for product in Product.objects.prefetch_related("category__attributes", "attributes__attribute").iterator():
        values_by_attribute = {}
        for old_value in product.attributes.all():
            values_by_attribute.setdefault(old_value.attribute_id, old_value.value)
        attribute_ids = set(values_by_attribute)
        for category in product.category.all():
            attribute_ids.update(category.attributes.values_list("id", flat=True))
        for attribute_id in attribute_ids:
            ProductAttribute.objects.get_or_create(
                product_id=product.pk,
                attribute_id=attribute_id,
                defaults={"value": values_by_attribute.get(attribute_id, "")},
            )


class Migration(migrations.Migration):
    dependencies = [
        ("product_module", "0009_productattribute"),
    ]

    operations = [
        migrations.RunPython(backfill_product_attributes, migrations.RunPython.noop),
    ]
