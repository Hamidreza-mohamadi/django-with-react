from django.urls import path

from site_module import views

urlpatterns = [
    # path('api/v1/products/' , views.HomeView.as_view() , name='home'),
    path("", views.AboutUSView.as_view(), name='about'),
    path('contact-us/', views.ContactUsCreateView.as_view(), name='contact-us'),

]