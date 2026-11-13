from datetime import timedelta

from django.contrib.auth.models import Permission
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from account_module.models import User
from .models import Article, ArticleCategory, ArticleComment
from .services import publish_scheduled_articles


class ArticleLifecycleTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username="article-author", email="author@example.com", password="test-password",
        )
        self.category = ArticleCategory.objects.create(title="آموزش برنامه‌نویسی")
        self.client = APIClient()

    def grant(self, user, *codenames):
        permissions = Permission.objects.filter(
            content_type__app_label="article_module", codename__in=codenames,
        )
        user.user_permissions.add(*permissions)

    def test_new_article_is_draft_and_gets_unique_slug(self):
        first = Article.objects.create(title="Django Tutorial", author=self.author)
        second = Article.objects.create(title="Django Tutorial", author=self.author)
        self.assertEqual(first.status, Article.Status.DRAFT)
        self.assertFalse(first.is_published)
        self.assertTrue(first.slug)
        self.assertNotEqual(first.slug, second.slug)

    def test_public_api_hides_non_public_articles(self):
        Article.objects.create(title="Draft", author=self.author, status=Article.Status.DRAFT)
        Article.objects.create(title="Review", author=self.author, status=Article.Status.REVIEW)
        Article.objects.create(title="Approved", author=self.author, status=Article.Status.APPROVED)
        Article.objects.create(
            title="Future", author=self.author, status=Article.Status.PUBLISHED,
            published_at=timezone.now() + timedelta(days=1),
        )
        response = self.client.get("/api/v1/articles/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_public_api_returns_published_article_only(self):
        article = Article.objects.create(title="Published", author=self.author, status=Article.Status.PUBLISHED)
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
        comment = ArticleComment.objects.create(article=article, user=self.author, text="A comment")
        self.assertEqual(comment.status, ArticleComment.Status.PENDING)

    def test_author_editor_publisher_workflow(self):
        editor = User.objects.create_user(username="editor", password="test-password")
        publisher = User.objects.create_user(username="publisher", password="test-password")
        self.grant(self.author, "add_article", "change_article")
        self.grant(editor, "review_article")
        self.grant(publisher, "publish_article")

        self.client.force_authenticate(self.author)
        response = self.client.post("/api/v1/articles/manage/", {
            "title": "Editorial workflow", "content": "Article body",
            "category": [self.category.pk],
        }, format="json")
        self.assertEqual(response.status_code, 201)
        article_id = response.data["id"]
        self.assertEqual(response.data["status"], Article.Status.DRAFT)
        self.assertEqual(response.data["author"]["username"], self.author.username)

        response = self.client.post(f"/api/v1/articles/manage/{article_id}/submit/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], Article.Status.REVIEW)

        self.client.force_authenticate(editor)
        response = self.client.get("/api/v1/articles/review/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        response = self.client.post(
            f"/api/v1/articles/review/{article_id}/decision/",
            {"decision": "approve"}, format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], Article.Status.APPROVED)

        self.client.force_authenticate(publisher)
        future = timezone.now() + timedelta(days=2)
        response = self.client.post(
            f"/api/v1/articles/publish/{article_id}/",
            {"scheduled_at": future.isoformat()}, format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], Article.Status.APPROVED)
        self.assertIsNotNone(response.data["scheduled_at"])

        article = Article.objects.get(pk=article_id)
        self.assertEqual(publish_scheduled_articles(now=future + timedelta(seconds=1)), 1)
        article.refresh_from_db()
        self.assertEqual(article.status, Article.Status.PUBLISHED)
        self.assertTrue(article.is_published)

    def test_author_cannot_edit_after_submitting(self):
        self.grant(self.author, "add_article", "change_article")
        article = Article.objects.create(title="In review", author=self.author, status=Article.Status.REVIEW)
        self.client.force_authenticate(self.author)
        response = self.client.patch(
            f"/api/v1/articles/manage/{article.pk}/",
            {"title": "Tampered"}, format="json",
        )
        self.assertEqual(response.status_code, 400)
        article.refresh_from_db()
        self.assertEqual(article.title, "In review")

    def test_due_scheduled_article_is_published_once(self):
        due = timezone.now() - timedelta(minutes=1)
        article = Article.objects.create(
            title="Scheduled for now", author=self.author,
            status=Article.Status.APPROVED, scheduled_at=due,
        )
        self.assertEqual(publish_scheduled_articles(), 1)
        article.refresh_from_db()
        self.assertEqual(article.status, Article.Status.PUBLISHED)
        self.assertTrue(article.is_published)
        self.assertIsNotNone(article.published_at)
        self.assertIsNone(article.scheduled_at)
        self.assertEqual(publish_scheduled_articles(), 0)
