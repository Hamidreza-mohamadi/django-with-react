from rest_framework import serializers
from .models import Article , ArticleCategory
from account_module.serializers import UserSerializer


class ArticleCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ArticleCategory
        fields = '__all__'


class ArticleSerializer(serializers.ModelSerializer):
    category = ArticleCategorySerializer(many=True, read_only=True)
    author = UserSerializer(read_only=True)

    class Meta:
        model = Article
        fields = '__all__'
#categ ?

