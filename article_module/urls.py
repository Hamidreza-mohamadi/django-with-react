from django.urls import path

from .views import (
    ArticleDetailGeneric,
    ArticleManagementDetailView,
    ArticleManagementListCreateView,
    ArticlePublicationView,
    ArticleReviewDecisionView,
    ArticleReviewQueueView,
    LatestArticlesView,
    SubmitArticleForReviewView,
)

urlpatterns = [
    path("manage/", ArticleManagementListCreateView.as_view(), name="article-manage-list"),
    path("manage/<int:pk>/", ArticleManagementDetailView.as_view(), name="article-manage-detail"),
    path("manage/<int:pk>/submit/", SubmitArticleForReviewView.as_view(), name="article-submit-review"),
    path("review/", ArticleReviewQueueView.as_view(), name="article-review-queue"),
    path("review/<int:pk>/decision/", ArticleReviewDecisionView.as_view(), name="article-review-decision"),
    path("publish/<int:pk>/", ArticlePublicationView.as_view(), name="article-publish"),
    path("", LatestArticlesView.as_view(), name="latest-articles"),
    path("<slug:slug>/", ArticleDetailGeneric.as_view(), name="article-detail"),
]
