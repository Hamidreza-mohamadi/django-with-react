from django.db import migrations, models


def backfill_unit_prices(apps, schema_editor):
    OrderItem = apps.get_model("order_module", "OrderItem")
    for item in OrderItem.objects.select_related("product").all().iterator():
        if item.final_price is not None and item.quantity:
            unit_price = max(0, item.final_price // item.quantity)
        else:
            product = item.product
            unit_price = product.current_price if product.current_price is not None else (product.price or 0)
        OrderItem.objects.filter(pk=item.pk).update(unit_price=unit_price)


class Migration(migrations.Migration):

    dependencies = [
        ("order_module", "0004_order_payment_deadline"),
    ]

    operations = [
        migrations.AddField(
            model_name="orderitem",
            name="unit_price",
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name="قیمت واحد هنگام سفارش"),
        ),
        migrations.RunPython(backfill_unit_prices, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="orderitem",
            name="quantity",
            field=models.PositiveIntegerField(default=1, verbose_name="تعداد"),
        ),
        migrations.AlterField(
            model_name="orderitem",
            name="final_price",
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name="مبلغ کل ردیف سفارش"),
        ),
        migrations.AlterField(
            model_name="orderitem",
            name="final_discount",
            field=models.PositiveIntegerField(default=0, verbose_name="مبلغ تخفیف نهایی"),
        ),
    ]
