from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from site_module.models import SiteSetting, Contact_Us
from site_module.serializers import SiteSettingSerializer, ContactUsSerializer
from utils.http_services import get_client_ip


# Create your views here.

class AboutUSView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        sitesetting = SiteSetting.objects.filter(is_main_setting=True).first()
        serializer = SiteSettingSerializer(sitesetting)
        return Response(serializer.data)


class ContactUsCreateView(generics.CreateAPIView):
    """ثبت پیام فرم تماس"""
    queryset = Contact_Us.objects.all()
    serializer_class = ContactUsSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(ip_address=get_client_ip(request))

        return Response(
            {"detail": "پیام شما با موفقیت ثبت شد. به‌زودی پاسخ می‌دهیم."},
            status=status.HTTP_201_CREATED
        )