from django.db import migrations, models
import django.db.models.deletion


def create_product_attribute_slots(apps, schema_editor):
    Product = apps.get_model("product_module", "Product")
    ProductAttribute = apps.get_model("product_module", "ProductAttribute")
    database = schema_editor.connection.alias

    for product in Product.objects.using(database).prefetch_related(
        "category__attributes", "attributes"
    ).iterator(chunk_size=200):
        existing_values = {}
        for value in product.attributes.all():
            existing_values.setdefault(value.attribute_id, value.pk)

        allowed_attribute_ids = set()
        for category in product.category.all():
            allowed_attribute_ids.update(
                category.attributes.values_list("pk", flat=True)
            )

        for attribute_id in allowed_attribute_ids:
            ProductAttribute.objects.using(database).get_or_create(
                product_id=product.pk,
                attribute_id=attribute_id,
                defaults={"value_id": existing_values.get(attribute_id)},
            )


class Migration(migrations.Migration):
    dependencies = [
        ("product_module", "0012_restore_attribute_values"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductAttribute",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "attribute",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="product_slots",
                        to="product_module.attribute",
                    ),
                ),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="attribute_slots",
                        to="product_module.product",
                    ),
                ),
                (
                    "value",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="product_slots",
                        to="product_module.attributevalue",
                        verbose_name="مقدار ویژگی",
                    ),
                ),
            ],
            options={
                "verbose_name": "ویژگی محصول",
                "verbose_name_plural": "ویژگی‌های محصول",
            },
        ),
        migrations.AddConstraint(
            model_name="productattribute",
            constraint=models.UniqueConstraint(
                fields=("product", "attribute"),
                name="unique_product_attribute_slot",
            ),
        ),
        migrations.RunPython(
            create_product_attribute_slots,
            migrations.RunPython.noop,
        ),
    ]
