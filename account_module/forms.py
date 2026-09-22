from django import forms
from django.core import validators
from django.core.exceptions import ValidationError

from .models import User


class SignUpForm(forms.Form):
    email = forms.EmailField(
        label='ایمیل',
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'ایمیل'}),
        validators=[
            validators.MaxLengthValidator(100),
            validators.EmailValidator,
        ]
    )
    password = forms.CharField(
        label='کلمه عبور',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'کلمه عبور'}),
        validators=[
            validators.MaxLengthValidator(100),
        ]
    )
    confirm_password = forms.CharField(
        label='تکرار کلمه عبور',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'تکرار کلمه عبور'}),
        validators=[
            validators.MaxLengthValidator(100),
        ]
    )

    def clean_confirm_password(self):
        password = self.cleaned_data.get('password')
        confirm_password = self.cleaned_data.get('confirm_password')

        if password == confirm_password:
            return confirm_password

        raise ValidationError('کلمه عبور و تکرار کلمه عبور مغایرت دارند')
    # class Meta:
    #     model = User
    #     fields = ['username', 'password', 'email']
    #     widgets = {
    #         'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'ایمیل'}),
    #         'password': forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'رمز عبور'}),
    #         'username': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'نام کاربری'})
    #     }
    #     labels = {'username': 'نام کاربری', 'email': 'ایمیل', 'password': 'رمز عبور'}


class LoginForm(forms.Form):
    email = forms.EmailField(
        label='ایمیل',
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'ایمیل'}),
        validators=[
            validators.MaxLengthValidator(100),
            validators.EmailValidator
        ]
    )
    password = forms.CharField(
        label='کلمه عبور',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'کلمه عبور'}),
        validators=[
            validators.MaxLengthValidator(100)
        ]
    )
    # class Meta:
    #     model = User
    #     fields = ['email', 'password']
    #     widgets={
    #         'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'ایمیل'}),
    #         'password': forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'رمز عبور'}),
    #     }
    #     labels = {'email': 'ایمیل', 'password': 'رمز عبور'}


class ForgetPasswordForm(forms.Form):
    email = forms.EmailField(
        label='ایمیل',
        widget=forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'ایمیل'}),
        validators=[
            validators.MaxLengthValidator(100),
            validators.EmailValidator
        ])


class RewritePasswordForm(forms.Form):
    new_password = forms.CharField(
        label='کلمه عبور جدید',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'کلمه عبور جدید'}),
        validators=[validators.MaxLengthValidator(100)])
    confirm_password = forms.CharField(
        label='تکرار کلمه عبور',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'تکرار کلمه عبور'}),
        validators=[validators.MaxLengthValidator(100)])

    def clean_confirm_password(self):
        password = self.cleaned_data.get('new_password')
        confirm_password = self.cleaned_data.get('confirm_password')

        if password == confirm_password:
            return confirm_password

        raise ValidationError('کلمه عبور و تکرار کلمه عبور مغایرت دارند')


class ChangePasswordForm(forms.Form):
    old_password = forms.CharField(
        label='کلمه عبور قدیمی',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'کلمه عبور قدیمی'}),
        validators=[validators.MaxLengthValidator(100)])
    new_password = forms.CharField(
        label='کلمه عبور جدید',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'کلمه عبور جدید'}),
        validators=[validators.MaxLengthValidator(100)])
    confirm_password = forms.CharField(
        label='تکرار کلمه عبور',
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'تکرار کلمه عبور جدید'}),
        validators=[validators.MaxLengthValidator(100)])

    def clean_confirm_password(self):
        password = self.cleaned_data.get('new_password')
        confirm_password = self.cleaned_data.get('confirm_password')

        if password == confirm_password:
            return confirm_password

        raise ValidationError('کلمه عبور و تکرار کلمه عبور مغایرت دارند')


class EditProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['avatar', 'first_name', 'last_name', 'username', 'about_user']
        widgets = {
            'avatar': forms.FileInput(attrs={'class': 'form-control', 'placeholder': 'تصویر پروفایل'}),
            'username': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'نام کاربری'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'نام'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'نام خانوادگی'}),
            'about_user': forms.Textarea(attrs={'class': 'form-control', 'placeholder': 'درباره من'})
        }
        labels = {'username': 'نام کاربری', 'avatar': 'تصویر پروفایل', 'about_user': 'درباره من', 'first_name': 'نام',
                  'last_name': 'نام خانوادگی'}
        error_messages = {
            'username': {
                'unique': 'این نام کاربری قبلاً توسط کاربر دیگری انتخاب شده است.',
                'invalid': 'نام کاربری وارد شده معتبر نیست.',
            },
            'avatar': {
                'invalid_image': 'فایل آپلود شده یک تصویر معتبر نیست.',
                'file_too_large': 'اندازه فایل تصویر بیش از حد مجاز است.',
                'invalid_extension': 'فرمت فایل تصویر نامعتبر است.',
            },
            'first_name': {
                'max_length': 'طول نام نباید بیشتر از %(limit_value)s کاراکتر باشد.',
                'min_length': 'طول نام باید حداقل %(limit_value)s کاراکتر باشد.',
            },
            'last_name': {
                'max_length': 'طول نام خانوادگی نباید بیشتر از %(limit_value)s کاراکتر باشد.',
                'min_length': 'طول نام خانوادگی باید حداقل %(limit_value)s کاراکتر باشد.',
            },
            'about_user': {
                'max_length': 'طول توضیحات درباره من نباید بیشتر از %(limit_value)s کاراکتر باشد.',
            },
        }
