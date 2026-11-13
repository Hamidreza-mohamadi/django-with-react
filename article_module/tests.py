from datetime import timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from account_module.models import User
from .models import Article, ArticleCategory, ArticleComment


class ArticleLifecycleTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username="article-author",
            email="author@example.com",
            password="test-password",
        )
        self.category = ArticleCategory.objects.create(title="آموزش برنامه‌نویسی")
        self.client = APIClient()

    def test_new_article_is_draft_and_gets_unique_slug(self):
        first = Article.objects.create(title="Django Tutorial", author=self.author)
        second = Article.objects.create(title="Django Tutorial", author=self.author)
        self.assertEqual(first.status, Article.Status.DRAFT)
        self.assertFalse(first.is_published)
        self.assertTrue(first.slug)
        self.assertNotEqual(first.slug, second.slug)

    def test_public_api_hides_draft_review_and_future_articles(self):
        Article.objects.create(title="Draft", author=self.author, status=Article.Status.DRAFT)
        Article.objects.create(title="Review", author=self.author, status=Article.Status.REVIEW)
        Article.objects.create(
            title="Scheduled",
            author=self.author,
            status=Article.Status.PUBLISHED,
            published_at=timezone.now() + timedelta(days=1),
        )
        response = self.client.get("/api/v1/articles/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_public_api_returns_published_article_only(self):
        article = Article.objects.create(
            title="Published",
            author=self.author,
            status=Article.Status.PUBLISHED,
        )
        response = self.client.get(f"/api/v1/articles/{article.slug}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["slug"], article.slug)

    def test_public_detail_does_not_expose_draft(self):
        article = Article.objects.create(title="Private draft", author=self.author)
        response = self.client.get(f"/api/v1/articles/{article.slug}/")
        self.assertEqual(response.status_code, 404)

    def test_publish_sets_timestamp_and_legacy_flag(self):
        article = Article.objects.create(title="Ready", author=self.author)
        article.publish()
        article.refresh_from_db()
        self.assertEqual(article.status, Article.Status.PUBLISHED)
        self.assertTrue(article.is_published)
        self.assertIsNotNone(article.published_at)

    def test_category_cannot_be_its_own_ancestor(self):
        parent = ArticleCategory.objects.create(title="Parent")
        child = ArticleCategory.objects.create(title="Child", parent=parent)
        parent.parent = child
        with self.assertRaises(ValidationError):
            parent.save()

    def test_comment_defaults_to_pending(self):
        article = Article.objects.create(title="Article", author=self.author)
        comment = ArticleComment.objects.create(
            article=article,
            user=self.author,
            text="A comment",
        )
        self.assertEqual(comment.status, ArticleComment.Status.PENDING)
