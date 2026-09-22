from django.contrib.auth.models import AbstractUser
from django.db import models


# Create your models here.

class User(AbstractUser):
    avatar = models.ImageField(upload_to='images/users/', blank=True, null=True, verbose_name="آواتار کاربر" )
    activation_code = models.CharField(max_length=200, blank=True, null=True, verbose_name="کد ایمیل فعالسازی", default='')
    about_user = models.TextField(max_length=200 ,verbose_name="درباره کاربر", blank=True, null=True, default='')

    def __str__(self):
        if self.first_name is not "" and self.last_name is not "":
            return self.get_full_name()
        return self.email

    class Meta:
        verbose_name = 'کاربر'
        verbose_name_plural = 'کاربران'
