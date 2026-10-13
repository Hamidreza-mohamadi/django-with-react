from django.urls import path
from .views import CancelOrderView, OrderDetailView, OrderListCreateView, OrderQuoteView

urlpatterns = [
    path("quote/", OrderQuoteView.as_view(), name="order-quote"),
    path("", OrderListCreateView.as_view(), name="order-list-create"),
    path("<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("<int:pk>/cancel/", CancelOrderView.as_view(), name="order-cancel"),
]
