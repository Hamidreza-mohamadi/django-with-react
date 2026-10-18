from django.db import migrations, models
import django.db.models.deletion


def migrate_product_attribute_values(apps, schema_editor):
    Product = apps.get_model("product_module", "Product")
    AttributeValue = apps.get_model("product_module", "AttributeValue")
    ProductAttribute = apps.get_model("product_module", "ProductAttribute")
    database = schema_editor.connection.alias

    for row in ProductAttribute.objects.using(database).exclude(value="").iterator(
        chunk_size=500
    ):
        value = row.value.strip()
        if not value:
            continue
        attribute_value, _ = AttributeValue.objects.using(database).get_or_create(
            attribute_id=row.attribute_id,
            value=value,
        )
        Product.objects.using(database).get(pk=row.product_id).attributes.add(
            attribute_value
        )


def restore_product_attribute_values(apps, schema_editor):
    Product = apps.get_model("product_module", "Product")
    ProductAttribute = apps.get_model("product_module", "ProductAttribute")
    database = schema_editor.connection.alias

    for product in Product.objects.using(database).prefetch_related("attributes").iterator(
        chunk_size=200
    ):
        for attribute_value in product.attributes.all():
            ProductAttribute.objects.using(database).update_or_create(
                product_id=product.pk,
                attribute_id=attribute_value.attribute_id,
                defaults={"value": attribute_value.value},
            )


class Migration(migrations.Migration):
    dependencies = [
        ("product_module", "0011_remove_legacy_attribute_value"),
    ]

    operations = [
        migrations.CreateModel(
            name="AttributeValue",
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
                    "value",
                    models.CharField(max_length=300, verbose_name="مقدار ویژگی"),
                ),
                (
                    "attribute",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="values",
                        to="product_module.attribute",
                    ),
                ),
            ],
            options={
                "verbose_name": "مقدار ویژگی",
                "verbose_name_plural": "مقادیر ویژگی‌ها",
                "ordering": ["attribute__title", "value"],
            },
        ),
        migrations.AddConstraint(
            model_name="attributevalue",
            constraint=models.UniqueConstraint(
                fields=("attribute", "value"),
                name="unique_attribute_value_text",
            ),
        ),
        migrations.AddField(
            model_name="product",
            name="attributes",
            field=models.ManyToManyField(
                blank=True,
                related_name="products",
                to="product_module.attributevalue",
                verbose_name="ویژگی‌ها",
            ),
        ),
        migrations.RunPython(
            migrate_product_attribute_values,
            restore_product_attribute_values,
        ),
        migrations.DeleteModel(name="ProductAttribute"),
    ]
