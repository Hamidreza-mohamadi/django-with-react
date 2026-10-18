import uuid

from django.db import migrations, models
import django.db.models.deletion


def create_default_variants(apps, schema_editor):
    Product = apps.get_model("product_module", "Product")
    ProductVariant = apps.get_model("product_module", "ProductVariant")
    db_alias = schema_editor.connection.alias

    for product in Product.objects.using(db_alias).all().iterator():
        variant = ProductVariant.objects.using(db_alias).create(
            product_id=product.pk,
            sku=f"LEGACY-{product.pk}-{uuid.uuid4().hex[:8].upper()}",
            price=max(0, product.price or 0),
            inventory=max(0, product.inventory or 0),
            is_active=product.is_active,
        )
        old_values = product.attributes.using(db_alias).exclude(value="").values_list("pk", flat=True)
        variant.attributes.add(*list(old_values))


class Migration(migrations.Migration):
    dependencies = [
        ("product_module", "0012_restore_attribute_values"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductVariant",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sku", models.CharField(blank=True, max_length=64, unique=True, verbose_name="شناسه کالا")),
                ("price", models.PositiveIntegerField(verbose_name="قیمت")),
                ("inventory", models.PositiveIntegerField(default=0, verbose_name="موجودی انبار")),
                ("is_active", models.BooleanField(default=True, verbose_name="فعال")),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="variants", to="product_module.product", verbose_name="محصول")),
            ],
            options={
                "verbose_name": "تنوع محصول",
                "verbose_name_plural": "تنوع‌های محصول",
                "ordering": ["id"],
            },
        ),
        migrations.AddField(
            model_name="productvariant",
            name="attributes",
            field=models.ManyToManyField(blank=True, related_name="product_variants", to="product_module.attributevalue", verbose_name="ویژگی‌های ترکیب"),
        ),
        migrations.RunPython(create_default_variants, migrations.RunPython.noop),
    ]
