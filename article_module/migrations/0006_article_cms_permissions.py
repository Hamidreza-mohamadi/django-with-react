from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("article_module", "0005_article_rich_content_tags_images"),
        ("article_module", "0002_articlecomment"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="article",
            options={
                "ordering": ["-published_at", "-id"],
                "permissions": [
                    ("publish_article", "Can publish or schedule article"),
                    ("review_article", "Can review submitted articles"),
                    ("view_all_articles", "Can view and manage all authors articles"),
                    ("moderate_article_comments", "Can moderate article comments"),
                    ("manage_article_roles", "Can assign article CMS roles"),
                ],
                "verbose_name": "مقاله",
                "verbose_name_plural": "مقاله‌ها",
            },
        ),
        migrations.AlterModelOptions(
            name="articlecomment",
            options={
                "ordering": ["create_date", "id"],
                "permissions": [("moderate_article_comments", "Can moderate article comments")],
                "verbose_name": "دیدگاه",
                "verbose_name_plural": "دیدگاه‌ها",
            },
        ),
    ]
}
