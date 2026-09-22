from django.contrib import admin
from django.utils.html import format_html
from .models import Article, ArticleCategory


# Register your models here.


class ArticleAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'pub_date')

    def save_model(self, request, obj: Article, form, change):
        if not change:
            obj.author = request.user
        return super().save_model(request, obj, form, change)


class ArticleCategoryAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_active')

    def save_model(self, request, obj: ArticleCategory, form, change):
        return super().save_model(request, obj, form, change)


admin.site.register(Article, ArticleAdmin)
admin.site.register(ArticleCategory, ArticleCategoryAdmin)
