from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("order_module", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "در انتظار پرداخت"),
                    ("confirmed", "تأیید شده"),
                    ("processing", "در حال آماده‌سازی"),
                    ("shipped", "ارسال شده"),
                    ("delivered", "تحویل شده"),
                    ("cancelled", "لغو شده"),
                ],
                default="pending",
                max_length=20,
                verbose_name="وضعیت سفارش",
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ثبت"),
        ),
        migrations.AddField(
            model_name="order",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, verbose_name="آخرین تغییر"),
        ),
    ]
