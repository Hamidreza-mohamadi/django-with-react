from django.db import transaction
from django.utils import timezone

from .models import Article


def publish_scheduled_articles(*, now=None, batch_size=100):
    """Publish due scheduled drafts; safe to run repeatedly from a scheduler."""
    now = now or timezone.now()
    article_ids = list(
        Article.objects.filter(
            status=Article.Status.DRAFT,
            scheduled_at__isnull=False,
            scheduled_at__lte=now,
        )
        .order_by("scheduled_at", "pk")
        .values_list("pk", flat=True)[:batch_size]
    )
    published_count = 0
    for article_id in article_ids:
        with transaction.atomic():
            article = Article.objects.select_for_update().filter(
                pk=article_id,
                status=Article.Status.DRAFT,
                scheduled_at__isnull=False,
                scheduled_at__lte=now,
            ).first()
            if article is None:
                continue
            article.publish(at=now)
            published_count += 1
    return published_count
