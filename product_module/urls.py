from django.urls import path

from product_module import views

urlpatterns = [
    path("favorites/", views.FavoritesView.as_view(), name="product-favorites"),
    # path('api/v1/products/' , views.HomeView.as_view() , name='home'),
    path("", views.ProductListView.as_view(), name='products'),
    path("<slug:slug>/", views.ProductDetailGeneric.as_view(), name='products-detail'),
]