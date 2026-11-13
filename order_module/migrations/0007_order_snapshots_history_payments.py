import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def populate_order_item_snapshots(apps, schema_editor):
    OrderItem = apps.get_model("order_module", "OrderItem")
    db = schema_editor.connection.alias
    for item in OrderItem.objects.using(db).select_related("product", "variant").iterator():
        name = item.product.title if item.product_id else ""
        sku = item.variant.sku if item.variant_id else ""
        attributes = []
        if item.variant_id:
            for value in item.variant.attributes.select_related("attribute").all():
                attributes.append({"title": value.attribute.title, "value": value.value})
        OrderItem.objects.using(db).filter(pk=item.pk).update(
            product_name_snapshot=name,
            sku_snapshot=sku,
            variant_attributes_snapshot=attributes,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("order_module", "0006_orderitem_variant"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="orderitem",
            name="product_name_snapshot",
            field=models.CharField(blank=True, max_length=255, verbose_name="نام محصول هنگام خرید"),
        ),
        migrations.AddField(
            model_name="orderitem",
            name="sku_snapshot",
            field=models.CharField(blank=True, max_length=64, verbose_name="شناسه کالا هنگام خرید"),
        ),
        migrations.AddField(
            model_name="orderitem",
            name="variant_attributes_snapshot",
            field=models.JSONField(blank=True, default=list, verbose_name="ویژگی‌های واریانت هنگام خرید"),
        ),
        migrations.CreateModel(
            name="OrderStatusHistory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("from_status", models.CharField(blank=True, choices=[("pending", "در انتظار پرداخت"), ("confirmed", "تأیید شده"), ("processing", "در حال آماده‌سازی"), ("shipped", "ارسال شده"), ("delivered", "تحویل شده"), ("cancelled", "لغو شده")], max_length=20, verbose_name="وضعیت قبلی")),
                ("to_status", models.CharField(choices=[("pending", "در انتظار پرداخت"), ("confirmed", "تأیید شده"), ("processing", "در حال آماده‌سازی"), ("shipped", "ارسال شده"), ("delivered", "تحویل شده"), ("cancelled", "لغو شده")], max_length=20, verbose_name="وضعیت جدید")),
                ("note", models.CharField(blank=True, max_length=500, verbose_name="توضیحات")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="زمان تغییر")),
                ("changed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="order_status_changes", to=settings.AUTH_USER_MODEL, verbose_name="تغییردهنده")),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="status_history", to="order_module.order", verbose_name="سفارش")),
            ],
            options={"ordering": ["created_at", "id"], "verbose_name": "تاریخچه وضعیت سفارش", "verbose_name_plural": "تاریخچه وضعیت سفارش‌ها"},
        ),
        migrations.CreateModel(
            name="PaymentEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("initiated", "آغاز شده"), ("succeeded", "موفق"), ("failed", "ناموفق"), ("refunded", "بازپرداخت شده")], default="initiated", max_length=20, verbose_name="وضعیت پرداخت")),
                ("provider", models.CharField(blank=True, max_length=80, verbose_name="درگاه پرداخت")),
                ("reference", models.CharField(blank=True, db_index=True, max_length=150, verbose_name="شناسه مرجع")),
                ("amount", models.PositiveBigIntegerField(verbose_name="مبلغ")),
                ("currency", models.CharField(default="TOMAN", max_length=12, verbose_name="واحد پول")),
                ("raw_response", models.JSONField(blank=True, default=dict, verbose_name="پاسخ خام درگاه")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="payment_events", to="order_module.order", verbose_name="سفارش")),
            ],
            options={"ordering": ["-created_at", "-id"], "verbose_name": "رویداد پرداخت", "verbose_name_plural": "رویدادهای پرداخت"},
        ),
        migrations.RunPython(populate_order_item_snapshots, migrations.RunPython.noop),
    ]
