from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.http import Http404
from django.shortcuts import render, redirect
from django.urls import reverse
from django.utils.crypto import get_random_string
from django.utils.decorators import method_decorator
from django.views.generic import FormView, View
from .forms import SignUpForm, LoginForm, ForgetPasswordForm, RewritePasswordForm, ChangePasswordForm, EditProfileForm
from .models import User
# from utils.email_service import send_email


# Create your views here.


# class SignUp(View):  # form view khub nist ba ravesh digar minevisim
#     def get(self, request):
#         form = SignUpForm()
#         context = {'form': form}
#         return render(request, 'sign_up.html', context)
#
#     def post(self, request):
#         form = SignUpForm(request.POST)
#         if form.is_valid():
#             email = form.cleaned_data.get('email')
#             # username = form.cleaned_data.get('username')
#             if User.objects.filter(email__iexact=email).exists():
#                 form.add_error({'email': 'ایمیل تکراری است'})
#             else:
#                 password = form.cleaned_data.get('password')
#                 new_user = User(email=email, username=email, is_active=False,
#                                 activation_code=get_random_string(70))
#                 new_user.set_password(password)
#                 new_user.save()
#                 send_email('فعالسازی حساب کاربری', new_user.email, {'user': new_user}, 'emails/activate_email.html')
#                 request.session['message'] ={'text': 'ایمیل فعال‌سازی به آدرس ایمیل شما ارسال شد.', 'alert_class': 'alert-success'}
#                 return redirect(reverse('login'))
#         return render(request, 'sign_up.html', {'form': form})
#
#
# class LogIn(View):
#     def get(self, request):
#         if request.user.is_authenticated:
#             return redirect(reverse('home'))
#         else:
#             form = LoginForm()
#             return render(request,'login.html', {'form': form})
#
#     def post(self, request):
#         form = LoginForm(request.POST)
#         if form.is_valid():
#             email = form.cleaned_data.get('email')
#             password = form.cleaned_data.get('password')
#             user = User.objects.filter(email__iexact=email).first()
#             if user is not None:
#                 if not user.is_active:
#                     form.add_error('email', 'حساب کاربری شما فعال نشده است')
#                 else:
#                     if user.check_password(password):
#                         login(request, user)
#                         request.session['message'] = {'text': 'welcome', 'alert_class': 'alert-success'}
#                         return redirect(reverse('user-panel'))
#                     else:
#                         form.add_error({'password': 'کلمه عبور اشتباه است'})
#             else:
#                 form.add_error({'email': 'کاربر یافت نشد'})
#         return render(request, 'login.html', {'form': form})
#
#
#
# class ActiveAccount(View):
#     def get(self, request, code):
#         user: User = User.objects.filter(activation_code__iexact=code).first()
#         if user is not None:
#             if not user.is_active:
#                 user.is_active = True
#                 user.activation_code = get_random_string(70)
#                 user.save()
#                 request.session['message'] = {'text': 'حساب کاربری شما با موفقیت ایجاد شد', 'alert_class': 'alert-success'}
#                 return redirect(reverse('login'))
#             else:
#                 request.session['message'] = {'text': 'حساب کاربری شما قبلا ایجاد شده است', 'alert_class': 'alert-success'}
#                 return redirect(reverse('user-panel'))
#
#         raise Http404
#
#
# class LogOut(View):
#     def get(self, request):
#         logout(request)
#         return redirect(reverse('login'))
#
#
# class ForgetPassword(View):
#     def get(self, request):
#         form = ForgetPasswordForm()
#         return render(request, 'forget_password.html', {'form': form})
#
#     def post(self, request):
#         form = ForgetPasswordForm(request.POST)
#         if form.is_valid():
#             email = form.cleaned_data.get('email')
#             user = User.objects.filter(email__iexact=email).first()
#             if user is not None:
#                 user.activation_code = get_random_string(70)
#
#                 send_email('فراموشی رمز عبور', user.email,
#                            {'user': user}, 'emails/forget_pass_email.html')
#                 user.save()
#                 request.session['message'] =  {'text': 'برای ادامه فرایند ایمیل خود را چک کنید', 'alert_class': 'alert-success'}
#                 return redirect(reverse('home'))
#             else:
#                 form.add_error('email' , 'حساب موجود نیست')
#         return render(request, 'forget_password.html', {'form': form})
#
#
# class RewritePass(View):
#     def get(self, request, code):
#         user: User = User.objects.filter(activation_code__iexact=code).first()
#         if user is not None:
#             form = RewritePasswordForm()
#             return render(request, 'rewrite_pass.html', {'form':form})
#         else:
#             raise Http404
#
#     def post(self, request, code):
#         form = RewritePasswordForm(request.POST)
#         if form.is_valid():
#             password = form.cleaned_data.get('new_password')
#             user = User.objects.filter(activation_code__iexact=code).first()
#             if user is not None:
#                 user.set_password(password)
#                 user.activation_code = get_random_string(70)
#                 user.save()
#                 request.session['message'] = {'text': 'رمز عبور با موفقیت ثبت شد', 'alert_class': 'alert-success'}
#                 return redirect(reverse('login'))
#             else:
#                 user.activation_code = get_random_string(70)
#                 raise Http404
#         return render(request, 'rewrite_pass.html', {'form':form})
#
#
# @method_decorator(login_required, name='dispatch')
# class ChangePassword(View):
#     def get(self, request):
#         form = ChangePasswordForm()
#         return render(request, 'change_pass.html', {'form':form})
#
#     def post(self, request):
#         form = ChangePasswordForm(request.POST)
#         if form.is_valid():
#             old_password = form.cleaned_data.get('old_password')
#             user = User.objects.get(id=request.user.id)
#             if user.check_password(old_password):
#                 password = form.cleaned_data.get('new_password')
#                 user.set_password(password)
#                 request.session['message'] =  {'text': 'رمز عبور با موفقیت ثبت شد', 'alert_class': 'alert-success'}
#             else:
#                 form.add_error('old_password', 'رمز عبور صحیح نیست')
#         return render(request, 'change_pass.html', {'form': form})
#
#
# @method_decorator(login_required, name='dispatch')
# class EditProfile(View):
#     def get(self, request):
#         form = EditProfileForm(instance= request.user)
#         user = User.objects.get(id=request.user.id)
#         return render(request, 'edit_profile.html', {'form': form, 'user':user})
#
#     def post(self, request):
#         form = EditProfileForm(request.POST,request.FILES, instance= request.user)
#         if form.is_valid():
#             form.save()
#             request.session['message'] =  {'text': 'تغییرات ذخیره شد', 'alert_class': 'alert-success'}
#         return render(request, 'edit_profile.html', {'form': form})

from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from article_module.serializers import UserSerializer
from rest_framework.authtoken.views import ObtainAuthToken


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


# دریافت اطلاعات کاربر لاگین شده
# class CurrentUserView(APIView):
#     permission_classes = [IsAuthenticated]
#
#     def get(self, request):
#         serializer = UserSerializer(request.user)
#         return Response(serializer.data)
#

class LoginView(ObtainAuthToken):
    pass
    # def post(self, request, *args, **kwargs):
    #     serializer = self.serializer_class(data=request.data)
    #     serializer.is_valid(raise_exception=True)
    #     user = serializer.validated_data['user']
    #     token, created = Token.objects.get_or_create(user=user)
    #     return Response({
    #         'token': token.key,
    #         'user_id': user.pk,
    #         'username': user.username
    #     })


# سیستم خروج از حساب
class LogoutView(APIView):
    pass
    # permission_classes = [IsAuthenticated]
    #
    # def post(self, request):
    #     # حذف توکن کاربر
    #     request.user.auth_token.delete()
    #     return Response({'message': 'با موفقیت خارج شدید'})