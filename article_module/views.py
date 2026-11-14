from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Article, ArticleCategory, ArticleComment, ArticleImage, ArticleTag
from .serializers import (
    ArticleCategorySerializer, ArticleCommentCreateSerializer, ArticleCommentModerationSerializer,
    ArticleCommentSerializer, ArticleImageSerializer, ArticleManagementSerializer,
    ArticleSerializer, ArticleTagSerializer,
)


def public_articles():
    now = timezone.now()
    return Article.objects.filter(status=Article.Status.PUBLISHED, published_at__isnull=False, published_at__lte=now).select_related("author").prefetch_related("category", "tags").order_by("-published_at", "-id")


def require_perm(user, permission):
    if not user.has_perm(permission):
        raise PermissionDenied("شما مجوز انجام این عملیات را ندارید.")


def owned_article_or_404(user, pk):
    return get_object_or_404(Article.objects.select_related("author"), pk=pk, author=user)


class PublicArticleListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ArticleSerializer

    def get_queryset(self):
        queryset = public_articles()
        params = self.request.query_params
        search = params.get("search")
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(short_description__icontains=search))
        if params.get("category"):
            queryset = queryset.filter(category__slug=params["category"])
        if params.get("tag"):
            queryset = queryset.filter(tags__slug=params["tag"])
        if params.get("author"):
            queryset = queryset.filter(author__username=params["author"])
        ordering = params.get("ordering", "-published_at")
        if ordering not in ("published_at", "-published_at", "title", "-title"):
            raise ValidationError({"ordering": "مرتب‌سازی مجاز نیست."})
        return queryset.order_by(ordering, "-id").distinct()


class LatestArticlesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        articles = public_articles()[:3]
        return Response(ArticleSerializer(articles, many=True, context={"request": request}).data)


class ArticleDetailGeneric(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = ArticleSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return public_articles()


class ArticleManagementListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.has_perm("article_module.add_article") or request.user.has_perm("article_module.change_article")):
            raise PermissionDenied("شما مجوز مشاهده مقالات مدیریتی را ندارید.")
        articles = Article.objects.filter(author=request.user).prefetch_related("category", "tags")
        return Response(ArticleManagementSerializer(articles, many=True, context={"request": request}).data)

    def post(self, request):
        require_perm(request.user, "article_module.add_article")
        serializer = ArticleManagementSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        article = serializer.save(author=request.user, status=Article.Status.DRAFT)
        return Response(ArticleManagementSerializer(article, context={"request": request}).data, status=status.HTTP_201_CREATED)


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
            raise ValidationError("فقط مقاله‌های پیش‌نویس قابل ویرایش هستند.")
        serializer = ArticleManagementSerializer(article, data=request.data, partial=True, context={"request": request})
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
        articles = Article.objects.filter(status=Article.Status.REVIEW).select_related("author").prefetch_related("category", "tags")
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
            scheduled_at = DateTimeField().run_validation(scheduled_at)
            if scheduled_at > timezone.now():
                article.scheduled_at = scheduled_at
                article.save()
                return Response(ArticleManagementSerializer(article, context={"request": request}).data)
        article.publish()
        return Response(ArticleManagementSerializer(article, context={"request": request}).data)


class ArticleImageUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        require_perm(request.user, "article_module.change_article")
        article = owned_article_or_404(request.user, pk)
        if article.status != Article.Status.DRAFT:
            raise ValidationError("فقط برای پیش‌نویس می‌توان تصویر بارگذاری کرد.")
        uploaded = request.FILES.get("image")
        if not uploaded:
            raise ValidationError({"image": "فایل تصویر الزامی است."})
        if uploaded.size > 5 * 1024 * 1024:
            raise ValidationError({"image": "حداکثر حجم تصویر ۵ مگابایت است."})
        image = ArticleImage.objects.create(article=article, image=uploaded, alt_text=request.data.get("alt_text", "")[:255], uploaded_by=request.user)
        return Response(ArticleImageSerializer(image, context={"request": request}).data, status=status.HTTP_201_CREATED)


class ArticleCategoryManagementView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_perm(request.user, "article_module.change_article")
        return Response(ArticleCategorySerializer(ArticleCategory.objects.all(), many=True).data)

    def post(self, request):
        require_perm(request.user, "article_module.add_article")
        serializer = ArticleCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(ArticleCategorySerializer(serializer.save()).data, status=status.HTTP_201_CREATED)


class ArticleCategoryDetailManagementView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        require_perm(request.user, "article_module.change_article")
        category = get_object_or_404(ArticleCategory, pk=pk)
        serializer = ArticleCategorySerializer(category, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response(ArticleCategorySerializer(serializer.save()).data)

    def delete(self, request, pk):
        require_perm(request.user, "article_module.delete_article")
        category = get_object_or_404(ArticleCategory, pk=pk)
        if category.articles.exists() or category.children.exists():
            raise ValidationError("ابتدا مقاله‌ها و زیر‌دسته‌ها را از این دسته‌بندی جدا کنید.")
        category.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ArticleTagManagementView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_perm(request.user, "article_module.change_article")
        return Response(ArticleTagSerializer(ArticleTag.objects.all(), many=True).data)

    def post(self, request):
        require_perm(request.user, "article_module.add_article")
        serializer = ArticleTagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(ArticleTagSerializer(serializer.save()).data, status=status.HTTP_201_CREATED)


class ArticleTagDetailManagementView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        require_perm(request.user, "article_module.change_article")
        tag = get_object_or_404(ArticleTag, pk=pk)
        serializer = ArticleTagSerializer(tag, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response(ArticleTagSerializer(serializer.save()).data)

    def delete(self, request, pk):
        require_perm(request.user, "article_module.delete_article")
        tag = get_object_or_404(ArticleTag, pk=pk)
        if tag.articles.exists():
            raise ValidationError("ابتدا این برچسب را از مقاله‌ها جدا کنید.")
        tag.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicArticleCommentListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        article = get_object_or_404(public_articles(), slug=slug)
        comments = article.comments.filter(status=ArticleComment.Status.APPROVED, parent__isnull=True).select_related("user").prefetch_related("children__user")
        return Response(ArticleCommentSerializer(comments, many=True, context={"request": request}).data)

    def post(self, request, slug):
        if not request.user.is_authenticated:
            raise PermissionDenied("برای ثبت دیدگاه ابتدا وارد حساب کاربری شوید.")
        article = get_object_or_404(public_articles(), slug=slug)
        serializer = ArticleCommentCreateSerializer(data=request.data, context={"article": article})
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(article=article, user=request.user, status=ArticleComment.Status.PENDING)
        return Response({"id": comment.id, "status": comment.status, "detail": "دیدگاه پس از بررسی نمایش داده می‌شود."}, status=status.HTTP_201_CREATED)


class ArticleCommentModerationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_perm(request.user, "article_module.review_article")
        comments = ArticleComment.objects.select_related("article", "user").filter(status=ArticleComment.Status.PENDING)
        return Response(ArticleCommentSerializer(comments, many=True, context={"request": request}).data)


class ArticleCommentModerationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        require_perm(request.user, "article_module.review_article")
        comment = get_object_or_404(ArticleComment, pk=pk)
        serializer = ArticleCommentModerationSerializer(comment, data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(ArticleCommentSerializer(serializer.save(), context={"request": request}).data)
