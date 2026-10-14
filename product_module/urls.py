from django.urls import path

from product_module import views

urlpatterns = [
    path("favorites/", views.FavoritesView.as_view(), name="product-favorites"),
    path("filters/", views.ProductFilterOptionsView.as_view(), name="product-filter-options"),
    path("categories/", views.CategoryListView.as_view(), name="product-categories"),
    path("", views.ProductListView.as_view(), name="products"),
    path("<slug:slug>/", views.ProductDetailGeneric.as_view(), name="products-detail"),
]
