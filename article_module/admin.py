from django.contrib import admin, messages

from .models import Article, ArticleCategory, ArticleComment, ArticleImage, ArticleTag


class ArticleImageInline(admin.TabularInline):
    model = ArticleImage
    extra = 0
    readonly_fields = ("created_at", "uploaded_by")

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "status", "scheduled_at", "published_at", "updated_at")
    list_filter = ("status", "category", "tags")
    search_fields = ("title", "content", "short_description", "author__username")
    prepopulated_fields = {"slug": ("title",)}
    autocomplete_fields = ("author",)
    filter_horizontal = ("category", "tags")
    readonly_fields = ("pub_date", "created_at", "updated_at", "published_at", "is_published")
    inlines = (ArticleImageInline,)
    fieldsets = (
        ("محتوا", {"fields": ("title", "slug", "author", "short_description", "content", "content_json", "image", "image_alt", "category", "tags")}),
        ("انتشار", {"fields": ("status", "scheduled_at", "published_at", "is_published")}),
        ("بهینه‌سازی موتور جست‌وجو", {"fields": ("meta_title", "meta_description")}),
        ("زمان‌ها", {"fields": ("pub_date", "created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if not request.user.has_perm("article_module.view_all_articles"):
            queryset = queryset.filter(author=request.user)
        return queryset

    def has_change_permission(self, request, obj=None):
        allowed = super().has_change_permission(request, obj)
        if not allowed:
            return False
        # Status transitions and all non-draft edits must go through the CMS workflow.
        return obj is None or obj.status == Article.Status.DRAFT

    def get_readonly_fields(self, request, obj=None):
        fields = list(super().get_readonly_fields(request, obj))
        fields.extend(("status", "scheduled_at"))
        if not request.user.has_perm("article_module.view_all_articles"):
            fields.append("author")
        return tuple(dict.fromkeys(fields))

    def save_model(self, request, obj, form, change):
        if not change:
            obj.author = obj.author or request.user
            obj.status = Article.Status.DRAFT
            obj.scheduled_at = None
            obj.published_at = None
        else:
            previous = Article.objects.get(pk=obj.pk)
            obj.status = previous.status
            obj.scheduled_at = previous.scheduled_at
            obj.published_at = previous.published_at
        super().save_model(request, obj, form, change)


@admin.register(ArticleCategory)
class ArticleCategoryAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "parent", "is_active")
    list_filter = ("is_active",)
    search_fields = ("title", "slug")
    prepopulated_fields = {"slug": ("title",)}
    autocomplete_fields = ("parent",)


@admin.register(ArticleTag)
class ArticleTagAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "is_active")
    list_filter = ("is_active",)
    search_fields = ("title", "slug")
    prepopulated_fields = {"slug": ("title",)}


@admin.register(ArticleComment)
class ArticleCommentAdmin(admin.ModelAdmin):
    list_display = ("article", "user", "status", "create_date", "parent")
    list_filter = ("status", "create_date")
    search_fields = ("article__title", "user__username", "text")
    readonly_fields = ("create_date",)


@admin.register(ArticleImage)
class ArticleImageAdmin(admin.ModelAdmin):
    list_display = ("article", "alt_text", "uploaded_by", "created_at")
    search_fields = ("article__title", "alt_text", "uploaded_by__username")
    readonly_fields = ("created_at",)
