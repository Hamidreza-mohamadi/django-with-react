from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Article
from .serializers import ArticleSerializer


def public_articles():
    now = timezone.now()
    return (
        Article.objects.filter(
            status=Article.Status.PUBLISHED,
            published_at__isnull=False,
            published_at__lte=now,
        )
        .select_related("author")
        .prefetch_related("category")
        .order_by("-published_at", "-id")
    )


class LatestArticlesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        articles = public_articles()[:3]
        serializer = ArticleSerializer(articles, many=True, context={"request": request})
        return Response(serializer.data)


class ArticleDetailGeneric(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = ArticleSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return public_articles()
