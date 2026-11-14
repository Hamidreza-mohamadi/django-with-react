from urllib.parse import urlparse

from django.conf import settings
from rest_framework import serializers

from account_module.serializers import PublicUserSerializer
from .models import Article, ArticleCategory, ArticleComment, ArticleImage, ArticleTag


ALLOWED_NODES = {"doc", "paragraph", "heading", "text", "bulletList", "orderedList", "listItem", "blockquote", "codeBlock", "horizontalRule", "image", "table", "tableRow", "tableHeader", "tableCell", "hardBreak"}
ALLOWED_MARKS = {"bold", "italic", "underline", "strike", "code", "link", "textStyle"}
FONT_FAMILIES = {"Vazirmatn", "IRANSans", "Arial", "Tahoma", "system"}
FONT_SIZES = {"12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"}
ALLOWED_COLORS = {"#111827", "#374151", "#6B7280", "#DC2626", "#2563EB", "#059669"}


def validate_rich_document(document, *, allowed_image_urls=None):
    if not isinstance(document, dict) or document.get("type") != "doc":
        raise serializers.ValidationError("ساختار محتوا باید یک سند Tiptap با ریشه doc باشد.")
    node_count = 0

    def walk(node, depth=0):
        nonlocal node_count
        node_count += 1
        if depth > 20 or node_count > 3000:
            raise serializers.ValidationError("ساختار محتوا بیش از حد عمیق یا بزرگ است.")
        if not isinstance(node, dict) or node.get("type") not in ALLOWED_NODES:
            raise serializers.ValidationError("نوع یکی از بلوک‌های محتوا مجاز نیست.")
        attrs = node.get("attrs") or {}
        if not isinstance(attrs, dict):
            raise serializers.ValidationError("ویژگی‌های بلوک نامعتبر است.")
        allowed_node_attrs = {
            "heading": {"level"}, "orderedList": {"start"},
            "image": {"src", "alt", "title", "width", "height"},
            "tableCell": {"colspan", "rowspan", "colwidth"},
            "tableHeader": {"colspan", "rowspan", "colwidth"},
        }
        if set(attrs) - allowed_node_attrs.get(node["type"], set()):
            raise serializers.ValidationError("یکی از ویژگی‌های بلوک مجاز نیست.")
        if node["type"] == "text" and (not isinstance(node.get("text"), str) or len(node["text"]) > 100000):
            raise serializers.ValidationError("متن یکی از بلوک‌ها نامعتبر یا بیش از حد طولانی است.")
        if node["type"] == "heading" and attrs.get("level", 2) not in (2, 3, 4):
            raise serializers.ValidationError("سطح تیتر باید ۲، ۳ یا ۴ باشد.")
        if node["type"] == "image":
            src = attrs.get("src", "")
            parsed = urlparse(src)
            if parsed.scheme or parsed.netloc or not src.startswith(settings.MEDIA_URL) or (allowed_image_urls is not None and src not in allowed_image_urls):
                raise serializers.ValidationError("تصویر محتوا باید از مسیر رسانه‌ای همین سایت آپلود شده باشد.")
        marks = node.get("marks", [])
        if not isinstance(marks, list):
            raise serializers.ValidationError("قالب‌بندی متن نامعتبر است.")
        for mark in marks:
            if not isinstance(mark, dict) or mark.get("type") not in ALLOWED_MARKS:
                raise serializers.ValidationError("نوع قالب‌بندی متن مجاز نیست.")
            mark_attrs = mark.get("attrs") or {}
            allowed_mark_attrs = {
                "link": {"href", "target", "rel"},
                "textStyle": {"fontFamily", "fontSize", "color"},
            }
            if not isinstance(mark_attrs, dict) or set(mark_attrs) - allowed_mark_attrs.get(mark["type"], set()):
                raise serializers.ValidationError("ویژگی قالب‌بندی متن مجاز نیست.")
            if mark["type"] == "link":
                href = mark_attrs.get("href", "")
                parsed = urlparse(href)
                if parsed.scheme not in ("", "http", "https", "mailto") or href.startswith("//"):
                    raise serializers.ValidationError("نشانی لینک معتبر نیست.")
                if mark_attrs.get("target") not in (None, "_blank", "_self"):
                    raise serializers.ValidationError("مقصد لینک مجاز نیست.")
            if mark["type"] == "textStyle":
                if mark_attrs.get("fontFamily") and mark_attrs["fontFamily"] not in FONT_FAMILIES:
                    raise serializers.ValidationError("فونت انتخاب‌شده مجاز نیست.")
                if mark_attrs.get("fontSize") and mark_attrs["fontSize"] not in FONT_SIZES:
                    raise serializers.ValidationError("اندازه فونت مجاز نیست.")
                if mark_attrs.get("color") and mark_attrs["color"] not in ALLOWED_COLORS:
                    raise serializers.ValidationError("رنگ انتخاب‌شده مجاز نیست.")
        children = node.get("content", [])
        if not isinstance(children, list):
            raise serializers.ValidationError("ساختار فرزندان بلوک نامعتبر است.")
        for child in children:
            walk(child, depth + 1)

    walk(document)
    return document


class ArticleCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ArticleCategory
        fields = ("id", "title", "slug", "about", "image", "parent", "is_active")


class ArticleTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArticleTag
        fields = ("id", "title", "slug", "is_active")


class ArticleImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ArticleImage
        fields = ("id", "url", "alt_text", "created_at")
        read_only_fields = fields

    def get_url(self, obj):
        return obj.image.url



class ArticleImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()
    alt_text = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate_image(self, value):
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("حداکثر حجم تصویر ۵ مگابایت است.")
        return value


class ArticleCommentSerializer(serializers.ModelSerializer):
    user = PublicUserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = ArticleComment
        fields = ("id", "article", "user", "text", "parent", "status", "create_date", "replies")
        read_only_fields = fields

    def get_replies(self, obj):
        if obj.parent_id:
            return []
        replies = obj.children.filter(status=ArticleComment.Status.APPROVED).select_related("user")
        return ArticleCommentSerializer(replies, many=True, context=self.context).data


class ArticleSerializer(serializers.ModelSerializer):
    category = ArticleCategorySerializer(many=True, read_only=True)
    tags = ArticleTagSerializer(many=True, read_only=True)
    author = PublicUserSerializer(read_only=True)

    class Meta:
        model = Article
        fields = ("id", "title", "slug", "short_description", "content", "content_json", "image", "image_alt", "author", "category", "tags", "published_at", "created_at", "updated_at", "pub_date", "is_published", "meta_title", "meta_description")
        read_only_fields = fields


class ArticleManagementSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=ArticleCategory.objects.filter(is_active=True), many=True, required=False)
    tags = serializers.PrimaryKeyRelatedField(queryset=ArticleTag.objects.filter(is_active=True), many=True, required=False)
    author = PublicUserSerializer(read_only=True)

    class Meta:
        model = Article
        fields = ("id", "title", "slug", "short_description", "content", "content_json", "image", "image_alt", "author", "category", "tags", "status", "scheduled_at", "published_at", "created_at", "updated_at", "meta_title", "meta_description")
        read_only_fields = ("id", "slug", "author", "status", "scheduled_at", "published_at", "created_at", "updated_at")

    def validate_content_json(self, value):
        allowed = set()
        if self.instance is not None:
            allowed = {item.image.url for item in self.instance.content_images.all()}
        return validate_rich_document(value, allowed_image_urls=allowed)


class ArticleCommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArticleComment
        fields = ("text", "parent")

    def validate_text(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("متن دیدگاه نمی‌تواند خالی باشد.")
        return value

    def validate(self, attrs):
        parent = attrs.get("parent")
        article = self.context["article"]
        if parent and (parent.article_id != article.id or parent.status != ArticleComment.Status.APPROVED or parent.parent_id):
            raise serializers.ValidationError({"parent": "پاسخ فقط به دیدگاه تأییدشده همان مقاله و حداکثر در یک سطح مجاز است."})
        return attrs


class ArticleCommentModerationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArticleComment
        fields = ("status",)

    def validate_status(self, value):
        if value not in (ArticleComment.Status.APPROVED, ArticleComment.Status.REJECTED):
            raise serializers.ValidationError("وضعیت باید approved یا rejected باشد.")
        return value
