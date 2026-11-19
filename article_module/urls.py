from django.urls import path

from .views import (
    ArticleCapabilitiesView, ArticleCategoryDetailManagementView, ArticleCategoryManagementView,
    ArticleCommentModerationDetailView, ArticleCommentModerationListView,
    ArticleDetailGeneric, ArticleImageUploadView, ArticleManagementDetailView,
    ArticleManagementListCreateView, ArticleManagementDeleteView, ArticleUnpublishView, ArticlePublicationView,
    ArticleTagDetailManagementView, ArticleTagManagementView, LatestArticlesView,
    PublicArticleCommentListCreateView, PublicArticleListView,
)

urlpatterns = [
    path("manage/capabilities/", ArticleCapabilitiesView.as_view(), name="article-capabilities"),
    path("manage/", ArticleManagementListCreateView.as_view(), name="article-manage-list"),
    path("manage/<int:pk>/", ArticleManagementDetailView.as_view(), name="article-manage-detail"),
    path("manage/<int:pk>/delete/", ArticleManagementDeleteView.as_view(), name="article-manage-delete"),
    path("manage/<int:pk>/images/", ArticleImageUploadView.as_view(), name="article-image-upload"),
    path("manage/categories/", ArticleCategoryManagementView.as_view(), name="article-category-manage"),
    path("manage/categories/<int:pk>/", ArticleCategoryDetailManagementView.as_view(), name="article-category-detail-manage"),
    path("manage/tags/", ArticleTagManagementView.as_view(), name="article-tag-manage"),
    path("manage/tags/<int:pk>/", ArticleTagDetailManagementView.as_view(), name="article-tag-detail-manage"),
    path("manage/comments/", ArticleCommentModerationListView.as_view(), name="article-comment-moderation-list"),
    path("manage/comments/<int:pk>/", ArticleCommentModerationDetailView.as_view(), name="article-comment-moderation-detail"),
    path("publish/<int:pk>/", ArticlePublicationView.as_view(), name="article-publish"),
    path("publish/<int:pk>/unpublish/", ArticleUnpublishView.as_view(), name="article-unpublish"),
    path("comments/<slug:slug>/", PublicArticleCommentListCreateView.as_view(), name="article-comments"),
    path("list/", PublicArticleListView.as_view(), name="article-list"),
    path("", LatestArticlesView.as_view(), name="latest-articles"),
    path("<slug:slug>/", ArticleDetailGeneric.as_view(), name="article-detail"),
]
