from django.core.management.base import BaseCommand, CommandError

from order_module.services import expire_due_orders


class Command(BaseCommand):
    help = "Expire overdue unpaid orders and release their reserved variant inventory."

    def add_arguments(self, parser):
        parser.add_argument("--batch-size", type=int, default=200)

    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        if batch_size < 1:
            raise CommandError("--batch-size must be greater than zero")
        count = expire_due_orders(batch_size=batch_size)
        self.stdout.write(self.style.SUCCESS(f"{count} expired order(s); reserved stock released."))
