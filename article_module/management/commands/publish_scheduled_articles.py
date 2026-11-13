from django.core.management.base import BaseCommand, CommandError

from article_module.services import publish_scheduled_articles


class Command(BaseCommand):
    help = "Publish article drafts whose scheduled publication time has arrived."

    def add_arguments(self, parser):
        parser.add_argument("--batch-size", type=int, default=100)

    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        if batch_size < 1:
            raise CommandError("--batch-size must be greater than zero")
        count = publish_scheduled_articles(batch_size=batch_size)
        self.stdout.write(self.style.SUCCESS(f"{count} scheduled article(s) published."))
