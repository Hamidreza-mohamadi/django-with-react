from django.contrib import admin, messages

from .models import Article, ArticleCategory, ArticleComment, ArticleImage, ArticleTag


class ArticleImageInline(admin.TabularInline):
    model = ArticleImage
    extra = 0
    readonly_fields = ("created_at", "uploaded_by")


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

    def get_readonly_fields(self, request, obj=None):
        fields = list(super().get_readonly_fields(request, obj))
        if not request.user.has_perm("article_module.publish_article"):
            fields.extend(("status", "scheduled_at"))
        return tuple(fields)

    def save_model(self, request, obj, form, change):
        can_publish = request.user.has_perm("article_module.publish_article")
        if not change and obj.author_id is None:
            obj.author = request.user
        if change:
            previous = Article.objects.get(pk=obj.pk)
            if not can_publish:
                obj.status, obj.scheduled_at, obj.published_at = previous.status, previous.scheduled_at, previous.published_at
            elif obj.status == Article.Status.APPROVED and previous.status != Article.Status.APPROVED:
                obj.status, obj.scheduled_at, obj.published_at = previous.status, previous.scheduled_at, previous.published_at
                self.message_user(request, "تأیید مقاله فقط در اختیار ویراستار است.", level=messages.ERROR)
            elif obj.status == Article.Status.PUBLISHED and previous.status != Article.Status.APPROVED:
                obj.status, obj.scheduled_at, obj.published_at = previous.status, previous.scheduled_at, previous.published_at
                self.message_user(request, "انتشار مستقیم مجاز نیست؛ مقاله باید ابتدا توسط ویراستار تأیید شود.", level=messages.ERROR)
            elif obj.scheduled_at and obj.status != Article.Status.APPROVED:
                obj.status, obj.scheduled_at, obj.published_at = previous.status, previous.scheduled_at, previous.published_at
                self.message_user(request, "فقط مقاله تأییدشده را می‌توان زمان‌بندی کرد.", level=messages.ERROR)
        elif can_publish and (obj.status in (Article.Status.APPROVED, Article.Status.PUBLISHED) or obj.scheduled_at):
            obj.status, obj.scheduled_at, obj.published_at = Article.Status.DRAFT, None, None
            self.message_user(request, "مقاله جدید ابتدا باید از مسیر بررسی و تأیید عبور کند.", level=messages.ERROR)
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
