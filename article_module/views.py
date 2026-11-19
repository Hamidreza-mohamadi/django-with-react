from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Article, ArticleCategory, ArticleComment, ArticleImage, ArticleTag
from .serializers import (
    ArticleCategorySerializer, ArticleCommentCreateSerializer, ArticleCommentModerationSerializer,
    ArticleCommentSerializer, ArticleImageSerializer, ArticleManagementSerializer,
    ArticleImageUploadSerializer, ArticleSerializer, ArticleTagSerializer,
)


def public_articles():
    now = timezone.now()
    return Article.objects.filter(status=Article.Status.PUBLISHED, published_at__isnull=False, published_at__lte=now).select_related("author").prefetch_related("category", "tags").order_by("-published_at", "-id")


# دسترسی هر نقش شامل تمام قابلیت‌های نقش‌های پایین‌تر است.
# این نگاشت در زمان بررسی مجوز هم اعمال می‌شود تا به اجرای دوباره
# دستور setup_article_roles برای هر کاربر وابسته نباشیم.
CMS_ROLE_PERMISSIONS = {
    "نویسنده": {
        "add_article", "change_article", "view_article",
    },
    "ویراستار": {
        "add_article", "change_article", "view_article",
        "view_all_articles", "publish_article",
    },
    "ناشر": {
        "add_article", "change_article", "view_article", "delete_article",
        "view_all_articles", "publish_article",
    },
    "مدیر محتوا": {
        "add_article", "change_article", "view_article", "delete_article",
        "view_all_articles", "publish_article", "moderate_article_comments",
        "manage_article_roles",
    },
    "ناظر کامنت‌ها": {
        "view_article", "moderate_article_comments",
    },
}


def has_cms_perm(user, permission):
    codename = permission.rsplit(".", 1)[-1]
    if user.is_superuser:
        return True

    inherited = set()
    for role_name in user.groups.values_list("name", flat=True):
        inherited.update(CMS_ROLE_PERMISSIONS.get(role_name, set()))

    # Permission-based inheritance also covers users whose role was assigned
    # through individual Django permissions instead of a named CMS group.
    if user.has_perm("article_module.publish_article"):
        inherited.update({
            "add_article", "change_article", "view_article",
            "view_all_articles", "publish_article",
        })
    if user.has_perm("article_module.delete_article"):
        inherited.update({
            "add_article", "change_article", "view_article", "delete_article",
            "view_all_articles", "publish_article",
        })
    if user.has_perm("article_module.manage_article_roles"):
        inherited.update({
            "add_article", "change_article", "view_article", "delete_article",
            "view_all_articles", "publish_article", "moderate_article_comments",
            "manage_article_roles",
        })

    django_permission = permission if "." in permission else f"article_module.{codename}"
    return codename in inherited or user.has_perm(django_permission)


def require_perm(user, permission):
    if not has_cms_perm(user, permission):
        raise PermissionDenied("شما مجوز انجام این عملیات را ندارید.")


def managed_article_or_404(user, pk):
    queryset = Article.objects.select_related("author")
    if not (has_cms_perm(user, "view_all_articles")):
        queryset = queryset.filter(author=user)
    return get_object_or_404(queryset, pk=pk)


class ArticleCapabilitiesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        permissions = {
            "create": has_cms_perm(user, "add_article"),
            "edit_own": has_cms_perm(user, "change_article"),
            "view_all": user.is_superuser or has_cms_perm(user, "view_all_articles"),
            "publish": has_cms_perm(user, "publish_article"),
            "delete": has_cms_perm(user, "delete_article"),
            "moderate_comments": has_cms_perm(user, "moderate_article_comments"),
            "manage_roles": has_cms_perm(user, "manage_article_roles"),
            "is_superuser": user.is_superuser,
        }
        return Response({"permissions": permissions, "groups": list(user.groups.values_list("name", flat=True))})


class ArticlePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class PublicArticleListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ArticleSerializer
    pagination_class = ArticlePagination

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
        if not (has_cms_perm(request.user, "add_article") or has_cms_perm(request.user, "change_article") or has_cms_perm(request.user, "view_all_articles")):
            raise PermissionDenied("شما مجوز مشاهده مقالات مدیریتی را ندارید.")
        articles = Article.objects.all() if has_cms_perm(request.user, "view_all_articles") else Article.objects.filter(author=request.user)
        articles = articles.select_related("author").prefetch_related("category", "tags")
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
        article = managed_article_or_404(request.user, pk)
        return Response(ArticleManagementSerializer(article, context={"request": request}).data)

    def patch(self, request, pk):
        require_perm(request.user, "article_module.change_article")
        article = managed_article_or_404(request.user, pk)
        serializer = ArticleManagementSerializer(article, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        article = serializer.save()
        return Response(ArticleManagementSerializer(article, context={"request": request}).data)


class ArticlePublicationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        require_perm(request.user, "article_module.publish_article")
        # هر دارنده مجوز انتشار می‌تواند هر مقاله‌ای را مستقیماً منتشر کند.
        article = get_object_or_404(Article, pk=pk)

        scheduled_at = request.data.get("scheduled_at")
        if scheduled_at:
            from rest_framework.fields import DateTimeField
            scheduled_at = DateTimeField().run_validation(scheduled_at)
            if scheduled_at <= timezone.now():
                raise ValidationError({"scheduled_at": "زمان انتشار باید در آینده باشد."})
            # وضعیت approved فقط برای سازگاری job زمان‌بندی قدیمی استفاده می‌شود؛
            # این وضعیت یک مرحله تأیید یا محدودیت دسترسی نیست.
            article.status = Article.Status.APPROVED
            article.published_at = None
            article.scheduled_at = scheduled_at
            article.save()
            return Response(ArticleManagementSerializer(article, context={"request": request}).data)

        article.publish()
        return Response(ArticleManagementSerializer(article, context={"request": request}).data)



class ArticleManagementDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        article = managed_article_or_404(request.user, pk)
        if article.status != Article.Status.DRAFT and not has_cms_perm(request.user, "delete_article"):
            raise PermissionDenied("فقط پیش‌نویس‌های خودتان را می‌توانید حذف کنید.")
        if article.author_id != request.user.id:
            require_perm(request.user, "article_module.delete_article")
        article.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ArticleUnpublishView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        require_perm(request.user, "article_module.publish_article")
        article = get_object_or_404(Article, pk=pk, status=Article.Status.PUBLISHED)
        article.status = Article.Status.APPROVED
        article.published_at = None
        article.scheduled_at = None
        article.save()
        return Response(ArticleManagementSerializer(article, context={"request": request}).data)


class ArticleImageUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        require_perm(request.user, "article_module.change_article")
        article = managed_article_or_404(request.user, pk)
        serializer = ArticleImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        image = ArticleImage.objects.create(
            article=article, image=serializer.validated_data["image"],
            alt_text=serializer.validated_data.get("alt_text", ""), uploaded_by=request.user,
        )
        if serializer.validated_data.get("is_cover"):
            article.image.name = image.image.name
            article.image_alt = image.alt_text
            article.save(update_fields=["image", "image_alt", "updated_at"])
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
        require_perm(request.user, "article_module.moderate_article_comments")
        comments = ArticleComment.objects.select_related("article", "user").filter(status=ArticleComment.Status.PENDING)
        return Response(ArticleCommentSerializer(comments, many=True, context={"request": request}).data)


class ArticleCommentModerationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        require_perm(request.user, "article_module.moderate_article_comments")
        comment = get_object_or_404(ArticleComment, pk=pk)
        serializer = ArticleCommentModerationSerializer(comment, data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(ArticleCommentSerializer(serializer.save(), context={"request": request}).data)

    def delete(self, request, pk):
        require_perm(request.user, "article_module.moderate_article_comments")
        comment = get_object_or_404(ArticleComment, pk=pk)
        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
