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

    def test_reviewer_cannot_publish_and_publisher_cannot_skip_review(self):
        editor = User.objects.create_user(username="reviewer-only", password="test-password")
        publisher = User.objects.create_user(username="publisher-only", password="test-password")
        self.grant(editor, "review_article")
        self.grant(publisher, "publish_article")
        article = Article.objects.create(title="Needs review", author=self.author)

        self.client.force_authenticate(publisher)
        response = self.client.post(f"/api/v1/articles/publish/{article.pk}/")
        self.assertEqual(response.status_code, 404)

        article.status = Article.Status.REVIEW
        article.save()
        self.client.force_authenticate(editor)
        response = self.client.post(
            f"/api/v1/articles/review/{article.pk}/decision/",
            {"decision": "approve"}, format="json",
        )
        self.assertEqual(response.status_code, 200)

        self.client.force_authenticate(editor)
        response = self.client.post(f"/api/v1/articles/publish/{article.pk}/")
        self.assertEqual(response.status_code, 403)

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


import base64
from django.core.files.uploadedfile import SimpleUploadedFile


class ArticleCmsApiTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(username="cms-author", email="cms@example.com", password="test-password")
        self.client = APIClient()
        self.article = Article.objects.create(title="CMS draft", author=self.author)

    def grant(self, user, *codenames):
        permissions = Permission.objects.filter(content_type__app_label="article_module", codename__in=codenames)
        user.user_permissions.add(*permissions)

    def test_management_api_accepts_structured_tiptap_document_and_rejects_unsafe_values(self):
        self.grant(self.author, "add_article", "change_article")
        self.client.force_authenticate(self.author)
        document = {
            "type": "doc",
            "content": [{
                "type": "heading", "attrs": {"level": 2},
                "content": [{
                    "type": "text", "text": "راهنمای خرید",
                    "marks": [{"type": "textStyle", "attrs": {"fontFamily": "Vazirmatn", "fontSize": "18px", "color": "#111827"}}],
                }],
            }],
        }
        response = self.client.post("/api/v1/articles/manage/", {
            "title": "Structured article", "content_json": document,
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["content_json"]["type"], "doc")
        article_id = response.data["id"]

        unsafe = {"type": "doc", "content": [{"type": "heading", "attrs": {"level": 1}}]}
        response = self.client.patch(
            f"/api/v1/articles/manage/{article_id}/", {"content_json": unsafe}, format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_article_image_upload_is_owned_by_draft_and_can_be_referenced(self):
        self.grant(self.author, "change_article")
        self.client.force_authenticate(self.author)
        png = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII="
        )
        upload = SimpleUploadedFile("inline.png", png, content_type="image/png")
        response = self.client.post(
            f"/api/v1/articles/manage/{self.article.pk}/images/",
            {"image": upload, "alt_text": "نمونه تصویر"}, format="multipart",
        )
        self.assertEqual(response.status_code, 201)
        image_url = response.data["url"]
        self.assertTrue(image_url.startswith("/medias/images/articles/content/"))

        document = {"type": "doc", "content": [{"type": "image", "attrs": {"src": image_url, "alt": "نمونه تصویر"}}]}
        response = self.client.patch(
            f"/api/v1/articles/manage/{self.article.pk}/", {"content_json": document}, format="json",
        )
        self.assertEqual(response.status_code, 200)

        foreign_document = {"type": "doc", "content": [{"type": "image", "attrs": {"src": "/medias/images/articles/content/other.png"}}]}
        response = self.client.patch(
            f"/api/v1/articles/manage/{self.article.pk}/", {"content_json": foreign_document}, format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_public_article_list_supports_search_filters_and_pagination(self):
        category = ArticleCategory.objects.create(title="راهنما")
        tag = ArticleTag.objects.create(title="آموزشی")
        for index in range(12):
            article = Article.objects.create(
                title=f"راهنمای شماره {index}", author=self.author,
                status=Article.Status.PUBLISHED,
            )
            article.category.add(category)
            article.tags.add(tag)
        response = self.client.get("/api/v1/articles/?category=rahnama&tag=amoozeshi&page_size=5")
        # Persian slugs are generated with the project's existing slug policy; use a robust filter check below.
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 12)
        self.assertEqual(len(response.data["results"]), 5)
        response = self.client.get("/api/v1/articles/?search=شماره%201")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

    def test_category_and_tag_management_requires_article_permissions(self):
        self.grant(self.author, "add_article", "change_article")
        self.client.force_authenticate(self.author)
        category_response = self.client.post(
            "/api/v1/articles/manage/categories/",
            {"title": "تکنولوژی", "about": "اخبار فناوری"}, format="json",
        )
        self.assertEqual(category_response.status_code, 201)
        tag_response = self.client.post(
            "/api/v1/articles/manage/tags/", {"title": "بررسی"}, format="json",
        )
        self.assertEqual(tag_response.status_code, 201)
        self.assertTrue(tag_response.data["slug"])

    def test_comments_require_review_before_public_display(self):
        reviewer = User.objects.create_user(username="cms-reviewer", password="test-password")
        self.grant(reviewer, "review_article")
        public_article = Article.objects.create(
            title="Public comments", author=self.author, status=Article.Status.PUBLISHED,
        )
        self.client.force_authenticate(self.author)
        response = self.client.post(
            f"/api/v1/articles/comments/{public_article.slug}/",
            {"text": "دیدگاه آزمایشی"}, format="json",
        )
        self.assertEqual(response.status_code, 201)
        comment_id = response.data["id"]
        self.client.force_authenticate(None)
        response = self.client.get(f"/api/v1/articles/comments/{public_article.slug}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

        self.client.force_authenticate(reviewer)
        response = self.client.get("/api/v1/articles/manage/comments/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        response = self.client.patch(
            f"/api/v1/articles/manage/comments/{comment_id}/",
            {"status": "approved"}, format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.client.force_authenticate(None)
        response = self.client.get(f"/api/v1/articles/comments/{public_article.slug}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
