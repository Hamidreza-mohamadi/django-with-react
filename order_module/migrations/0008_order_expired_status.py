from django.db import migrations, models


ORDER_STATUS_CHOICES = [
    ("pending", "در انتظار پرداخت"),
    ("confirmed", "تأیید شده"),
    ("processing", "در حال آماده‌سازی"),
    ("shipped", "ارسال شده"),
    ("delivered", "تحویل شده"),
    ("cancelled", "لغو شده"),
    ("expired", "منقضی شده"),
]


class Migration(migrations.Migration):
    dependencies = [
        ("order_module", "0007_order_snapshots_history_payments"),
    ]

    operations = [
        migrations.AlterField(
            model_name="order",
            name="status",
            field=models.CharField(
                choices=ORDER_STATUS_CHOICES,
                default="pending",
                max_length=20,
                verbose_name="وضعیت سفارش",
            ),
        ),
        migrations.AlterField(
            model_name="orderstatushistory",
            name="from_status",
            field=models.CharField(
                blank=True,
                choices=ORDER_STATUS_CHOICES,
                max_length=20,
                verbose_name="وضعیت قبلی",
            ),
        ),
        migrations.AlterField(
            model_name="orderstatushistory",
            name="to_status",
            field=models.CharField(
                choices=ORDER_STATUS_CHOICES,
                max_length=20,
                verbose_name="وضعیت جدید",
            ),
        ),
    ]
