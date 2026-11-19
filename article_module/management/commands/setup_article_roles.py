from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand


ROLE_PERMISSIONS = {
    "نویسنده": [
        "add_article", "change_article", "view_article",
    ],
    "ویراستار": [
        "add_article", "change_article", "view_article",
        "review_article", "view_all_articles",
    ],
    "ناشر": [
        "add_article", "change_article", "view_article",
        "review_article", "view_all_articles", "publish_article",
    ],
    "مدیر محتوا": [
        "add_article", "change_article", "view_article", "delete_article",
        "review_article", "view_all_articles", "publish_article",
        "moderate_article_comments", "manage_article_roles",
    ],
    "ناظر کامنت‌ها": [
        "view_article", "moderate_article_comments",
    ],
}


class Command(BaseCommand):
    help = "Create/update the standard hierarchical article CMS role groups."

    def handle(self, *args, **options):
        permissions = {
            permission.codename: permission
            for permission in Permission.objects.filter(
                content_type__app_label="article_module",
                content_type__model="article",
            )
        }
        for role_name, codenames in ROLE_PERMISSIONS.items():
            group, _ = Group.objects.get_or_create(name=role_name)
            missing = [code for code in codenames if code not in permissions]
            if missing:
                self.stderr.write(self.style.ERROR(
                    f"{role_name}: permissions not found: {', '.join(missing)}"
                ))
                continue
            group.permissions.set([permissions[code] for code in codenames])
            self.stdout.write(self.style.SUCCESS(f"Configured role: {role_name}"))
        self.stdout.write(
            "نقش مدیر سیستم از طریق is_superuser مدیریت می‌شود و نباید صرفاً یک گروه عادی باشد."
        )
