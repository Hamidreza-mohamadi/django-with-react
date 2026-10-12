import logging
import secrets
import string

from django.conf import settings
from django.contrib.auth import update_session_auth_hash
from django.core.mail import send_mail
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status, serializers
from rest_framework.views import APIView
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .serializers import UserSerializer, RegisterSerializer

logger = logging.getLogger(__name__)


class EmailInputSerializer(serializers.Serializer):
    email = serializers.EmailField()


def _new_code():
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(70))


def _send_account_email(subject, user, path, message):
    frontend_url = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")
    link = f"{frontend_url}/{path.lstrip('/')}"
    if settings.DEBUG:
        logger.warning("[ACCOUNT EMAIL LINK - DEBUG ONLY] %s", link)
    send_mail(subject, f"{message}\n\n{link}", settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user, context={"request": request}).data)


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save(is_active=False, activation_code=_new_code())
        try:
            _send_account_email(
                "فعال‌سازی حساب کاربری", user, f"active-account/{user.activation_code}",
                "برای فعال‌سازی حساب کاربری خود، لینک زیر را باز کنید:"
            )
        except Exception:
            user.delete()
            return Response(
                {"detail": "ارسال ایمیل فعال‌سازی انجام نشد. تنظیمات ایمیل سرور را بررسی کنید."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            {"detail": "ثبت‌نام انجام شد. برای فعال‌سازی حساب، ایمیل خود را بررسی کنید."},
            status=status.HTTP_201_CREATED,
        )


class ActiveAccountView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, code):
        user = User.objects.filter(activation_code__iexact=code).first()
        if user is None:
            return Response({"detail": "لینک فعال‌سازی نامعتبر یا منقضی شده است."}, status=status.HTTP_400_BAD_REQUEST)
        if user.is_active:
            return Response({"detail": "این حساب قبلاً فعال شده است."}, status=status.HTTP_200_OK)
        user.is_active = True
        user.activation_code = _new_code()
        user.save(update_fields=["is_active", "activation_code"])
        return Response({"detail": "حساب کاربری با موفقیت فعال شد."})


class ForgetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EmailInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        # Return the same message whether the account exists or not.
        if user:
            user.activation_code = _new_code()
            user.save(update_fields=["activation_code"])
            try:
                _send_account_email(
                    "بازیابی رمز عبور", user, f"rewrite-pass/{user.activation_code}",
                    "برای تعیین رمز عبور جدید، لینک زیر را باز کنید:"
                )
            except Exception:
                return Response({"detail": "ارسال ایمیل انجام نشد. تنظیمات ایمیل سرور را بررسی کنید."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({"detail": "اگر حساب فعالی با این ایمیل وجود داشته باشد، لینک بازیابی برای شما ارسال می‌شود."})


class RewritePassView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, code):
        user = User.objects.filter(activation_code__iexact=code, is_active=True).first()
        if user is None:
            return Response({"detail": "لینک بازیابی نامعتبر یا قبلاً استفاده شده است."}, status=status.HTTP_400_BAD_REQUEST)
        new_password = request.data.get("new_password", "")
        confirm_password = request.data.get("confirm_password", "")
        if new_password != confirm_password:
            return Response({"confirm_password": ["رمز عبور و تکرار آن یکسان نیستند."]}, status=status.HTTP_400_BAD_REQUEST)
        if not new_password:
            return Response({"new_password": ["رمز عبور نمی‌تواند خالی باشد."]}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.activation_code = _new_code()
        user.save(update_fields=["password", "activation_code"])
        return Response({"detail": "رمز عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید."})


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get("old_password", "")
        new_password = request.data.get("new_password", "")
        confirm_password = request.data.get("confirm_password", "")
        if not request.user.check_password(old_password):
            return Response({"old_password": ["رمز عبور فعلی صحیح نیست."]}, status=status.HTTP_400_BAD_REQUEST)
        if new_password != confirm_password:
            return Response({"confirm_password": ["رمز عبور و تکرار آن یکسان نیستند."]}, status=status.HTTP_400_BAD_REQUEST)
        if not new_password:
            return Response({"new_password": ["رمز عبور نمی‌تواند خالی باشد."]}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])
        update_session_auth_hash(request, request.user)
        return Response({"detail": "رمز عبور با موفقیت تغییر کرد."})


class EditProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        return Response(UserSerializer(request.user, context={"request": request}).data)

    def patch(self, request):
        serializer = UserSerializer(
            request.user, data=request.data, partial=True,
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass
        return Response(status=status.HTTP_204_NO_CONTENT)
