from rest_framework import serializers

from account_module.serializers import PublicUserSerializer
from .models import Article, ArticleCategory


class ArticleCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ArticleCategory
        fields = ("id", "title", "slug", "about", "image", "parent", "is_active")
        read_only_fields = fields


class ArticleSerializer(serializers.ModelSerializer):
    category = ArticleCategorySerializer(many=True, read_only=True)
    author = PublicUserSerializer(read_only=True)

    class Meta:
        model = Article
        fields = (
            "id", "title", "slug", "short_description", "content",
            "image", "image_alt", "author", "category",
            "published_at", "created_at", "updated_at", "pub_date", "is_published",
            "meta_title", "meta_description",
        )
        read_only_fields = fields
