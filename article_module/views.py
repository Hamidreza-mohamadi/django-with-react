from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Article
from .serializers import ArticleManagementSerializer, ArticleSerializer


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


def require_perm(user, permission):
    if not user.has_perm(permission):
        raise PermissionDenied("شما مجوز انجام این عملیات را ندارید.")


def owned_article_or_404(user, pk):
    return get_object_or_404(Article.objects.select_related("author"), pk=pk, author=user)


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


class ArticleManagementListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_perm(request.user, "article_module.add_article")
        articles = Article.objects.filter(author=request.user).prefetch_related("category")
        data = ArticleManagementSerializer(articles, many=True, context={"request": request}).data
        return Response(data)

    def post(self, request):
        require_perm(request.user, "article_module.add_article")
        serializer = ArticleManagementSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        article = serializer.save(author=request.user, status=Article.Status.DRAFT)
        return Response(
            ArticleManagementSerializer(article, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ArticleManagementDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        require_perm(request.user, "article_module.change_article")
        article = owned_article_or_404(request.user, pk)
        return Response(ArticleManagementSerializer(article, context={"request": request}).data)

    def patch(self, request, pk):
        require_perm(request.user, "article_module.change_article")
        article = owned_article_or_404(request.user, pk)
        if article.status != Article.Status.DRAFT:
            raise ValidationError("فقط مقاله‌های پیش‌نویس قابل ویرایش هستند؛ ابتدا وضعیت بررسی باید تعیین تکلیف شود.")
        serializer = ArticleManagementSerializer(
            article, data=request.data, partial=True, context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        article = serializer.save()
        return Response(ArticleManagementSerializer(article, context={"request": request}).data)


class SubmitArticleForReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        require_perm(request.user, "article_module.change_article")
        article = owned_article_or_404(request.user, pk)
        if article.status != Article.Status.DRAFT:
            raise ValidationError("فقط مقاله پیش‌نویس را می‌توان برای بررسی ارسال کرد.")
        article.status = Article.Status.REVIEW
        article.save()
        return Response(ArticleManagementSerializer(article, context={"request": request}).data)


class ArticleReviewQueueView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_perm(request.user, "article_module.review_article")
        articles = Article.objects.filter(status=Article.Status.REVIEW).select_related("author").prefetch_related("category")
        return Response(ArticleManagementSerializer(articles, many=True, context={"request": request}).data)


class ArticleReviewDecisionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        require_perm(request.user, "article_module.review_article")
        article = get_object_or_404(Article, pk=pk, status=Article.Status.REVIEW)
        decision = request.data.get("decision")
        if decision == "approve":
            article.status = Article.Status.APPROVED
        elif decision == "reject":
            article.status = Article.Status.DRAFT
        else:
            raise ValidationError({"decision": "مقدار مجاز approve یا reject است."})
        article.save()
        return Response(ArticleManagementSerializer(article, context={"request": request}).data)


class ArticlePublicationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        require_perm(request.user, "article_module.publish_article")
        article = get_object_or_404(Article, pk=pk, status=Article.Status.APPROVED)

        scheduled_at = request.data.get("scheduled_at")
        if scheduled_at:
            from rest_framework.fields import DateTimeField
            try:
                scheduled_at = DateTimeField().run_validation(scheduled_at)
            except ValidationError:
                raise
            if scheduled_at > timezone.now():
                article.scheduled_at = scheduled_at
                article.save()
                return Response(ArticleManagementSerializer(article, context={"request": request}).data)

        article.publish()
        return Response(ArticleManagementSerializer(article, context={"request": request}).data)
