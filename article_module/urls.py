from django.urls import path

from .views import (
    ArticleCategoryDetailManagementView, ArticleCategoryManagementView,
    ArticleCommentModerationDetailView, ArticleCommentModerationListView,
    ArticleDetailGeneric, ArticleImageUploadView, ArticleManagementDetailView,
    ArticleManagementListCreateView, ArticlePublicationView,
    ArticleReviewDecisionView, ArticleReviewQueueView, ArticleTagDetailManagementView,
    ArticleTagManagementView, LatestArticlesView, PublicArticleCommentListCreateView,
    PublicArticleListView, SubmitArticleForReviewView,
)

urlpatterns = [
    path("manage/", ArticleManagementListCreateView.as_view(), name="article-manage-list"),
    path("manage/<int:pk>/", ArticleManagementDetailView.as_view(), name="article-manage-detail"),
    path("manage/<int:pk>/submit/", SubmitArticleForReviewView.as_view(), name="article-submit-review"),
    path("manage/<int:pk>/images/", ArticleImageUploadView.as_view(), name="article-image-upload"),
    path("manage/categories/", ArticleCategoryManagementView.as_view(), name="article-category-manage"),
    path("manage/categories/<int:pk>/", ArticleCategoryDetailManagementView.as_view(), name="article-category-detail-manage"),
    path("manage/tags/", ArticleTagManagementView.as_view(), name="article-tag-manage"),
    path("manage/tags/<int:pk>/", ArticleTagDetailManagementView.as_view(), name="article-tag-detail-manage"),
    path("manage/comments/", ArticleCommentModerationListView.as_view(), name="article-comment-moderation-list"),
    path("manage/comments/<int:pk>/", ArticleCommentModerationDetailView.as_view(), name="article-comment-moderation-detail"),
    path("review/", ArticleReviewQueueView.as_view(), name="article-review-queue"),
    path("review/<int:pk>/decision/", ArticleReviewDecisionView.as_view(), name="article-review-decision"),
    path("publish/<int:pk>/", ArticlePublicationView.as_view(), name="article-publish"),
    path("comments/<slug:slug>/", PublicArticleCommentListCreateView.as_view(), name="article-comments"),
    path("list/", PublicArticleListView.as_view(), name="article-list"),
    path("", LatestArticlesView.as_view(), name="latest-articles"),
    path("<slug:slug>/", ArticleDetailGeneric.as_view(), name="article-detail"),
]
