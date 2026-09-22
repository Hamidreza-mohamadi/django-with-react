from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from account_module.models import User
from .models import Article  # مدل مقاله شما
from .serializers import ArticleSerializer, UserSerializer
# Create your views here.


# دریافت ۳ مقاله آخر
class LatestArticlesView(APIView):
    # permission_classes = [IsAuthenticated]
    permission_classes = [AllowAny]

    def get(self, request):
        articles = Article.objects.filter(is_published=True).order_by('-pub_date')[:3]
        serializer = ArticleSerializer(articles, many=True, context={"request": request}) #request ra deepseek goft ke adress image dorost befreste
        return Response(serializer.data)


class ArticleDetailGeneric(generics.RetrieveAPIView):
    queryset = Article.objects.all().order_by('-pub_date')
    serializer_class = ArticleSerializer
    lookup_field = "slug"

