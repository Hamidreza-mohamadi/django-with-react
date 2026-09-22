from .views import LatestArticlesView, ArticleDetailGeneric
from django.urls import path

urlpatterns = [
    path('', LatestArticlesView.as_view(), name='latest-articles'),
    path('<slug:slug>/', ArticleDetailGeneric.as_view(), name='article-detail'),

]