from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("order_module", "0003_protect_order_history"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="expires_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="مهلت پرداخت"),
        ),
    ]
