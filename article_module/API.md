# Article Module API

Base URL: /api/v1/articles/. Management endpoints require a JWT access token unless otherwise noted.

## Public articles

| Method | Endpoint | Description |
|---|---|---|
| GET | / | Legacy endpoint: latest three published articles (kept for frontend compatibility) |
| GET | list/ | Paginated public list |
| GET | <slug>/ | Published article detail |
| GET | comments/<slug>/ | Approved comments and one-level replies |
| POST | comments/<slug>/ | Submit a comment (authenticated; pending moderation) |

Public list query parameters: search, category (slug), tag (slug), author (username), ordering (published_at, -published_at, title, -title), page, page_size (maximum 50).

## Article management

Permissions are capability-based. A user with `add_article` can create articles; a user with `change_article` can edit articles they own or any article covered by their `view_all_articles` permission. Publication status does not impose an approval gate.

| Method | Endpoint | Description |
|---|---|---|
| GET, POST | manage/ | List accessible articles / create an article |
| GET, PATCH | manage/<id>/ | Read or edit an accessible article, including published articles |
| POST | manage/<id>/images/ | Upload an inline image or cover image (multipart: image, optional alt_text, optional is_cover=true) |
| DELETE | manage/<id>/delete/ | Delete an own draft or any article when the user has `delete_article` |
| POST | publish/<id>/ | Publish any accessible article when the user has `publish_article`; optional future `scheduled_at` schedules it |
| POST | publish/<id>/unpublish/ | Unpublish an article when the user has `publish_article` |


Image uploads are limited to 5 MiB and must be valid image files. The response URL is a relative media URL. Set is_cover=true to also assign the uploaded file to the article's main image field. Only images uploaded to that article may be referenced by its content_json.

## Rich content format

New rich content is stored in content_json as a Tiptap document JSON object. The legacy content text field remains available for existing records and old clients.

Supported nodes: doc, paragraph, heading (levels 2–4), text, bulletList, orderedList, listItem, blockquote, codeBlock, horizontalRule, image, table, tableRow, tableHeader, tableCell, hardBreak.

Supported marks: bold, italic, underline, strike, code, link, textStyle. Text style is restricted to approved font families (Vazirmatn, IRANSans, Arial, Tahoma, system), font sizes (12–32px from the configured list), and a small approved color palette. HTML strings, unknown node/mark types, external image URLs, and images not uploaded to the current article are rejected.

Example document:

    {
      "type": "doc",
      "content": [
        { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "عنوان بخش" }] },
        { "type": "paragraph", "content": [{ "type": "text", "text": "متن مقاله", "marks": [{ "type": "textStyle", "attrs": { "fontFamily": "Vazirmatn", "fontSize": "18px" } }] }] }
      ]
    }

## Categories and tags

Requires article add/change/delete permissions respectively.

| Method | Endpoint | Description |
|---|---|---|
| GET, POST | manage/categories/ | List or create categories |
| PATCH, DELETE | manage/categories/<id>/ | Update or delete an unused category |
| GET, POST | manage/tags/ | List or create tags |
| PATCH, DELETE | manage/tags/<id>/ | Update or delete an unused tag |

The article management serializer accepts category and tag ID arrays.

## Publication and comments moderation

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | manage/comments/ | moderate_article_comments | List pending comments |
| PATCH | manage/comments/<id>/ | moderate_article_comments | Approve or reject a comment |
| DELETE | manage/comments/<id>/ | moderate_article_comments | Delete a comment |

A user with `publish_article` can publish an article directly from any publication status. There is no mandatory draft-review-approval chain. Scheduling is an optional publication time, not an approval step. Comments are submitted by authenticated users and are not public until approved. Replies are limited to one level.


## CMS roles and capabilities

The CMS uses Django Groups and model permissions. Users may belong to multiple groups; Django combines the permissions granted by all assigned groups.

Run the following after applying migrations:

```bash
python manage.py migrate
python manage.py setup_article_roles
```

The command creates or updates these hierarchical groups:

- `نویسنده`: create and edit own articles.
- `ویراستار`: all writer permissions, view and edit all articles, and publish directly.
- `ناشر`: all editor permissions plus delete articles.
- `مدیر محتوا`: all publisher permissions, moderate comments, and manage CMS roles.
- `ناظر کامنت‌ها`: moderate comments without article editing or publishing permissions.

Higher roles inherit the capabilities of lower roles. No role is required to pass an article through draft, review, or approval stages before publishing.

The system administrator is a Django superuser. Assign one or more groups to a user from Django Admin → Users → Groups. A user's effective permissions are the union of all assigned groups.

### Capability discovery

`GET /api/v1/articles/manage/capabilities/` returns the authenticated user's effective CMS capabilities. The React dashboard uses this response to decide which sections and actions to display. Every mutation is independently permission-checked by the API.

### Capability-based actions

- `POST /api/v1/articles/publish/{id}/`: publish any article or schedule it for a future time.
- `POST /api/v1/articles/publish/{id}/unpublish/`: unpublish an article.
- `DELETE /api/v1/articles/manage/{id}/delete/`: delete an article according to the user's delete permission.
- `PATCH /api/v1/articles/manage/comments/{id}/`: approve or reject a comment.
- `DELETE /api/v1/articles/manage/comments/{id}/`: delete a comment.


The public API continues to return only published articles whose publication time has arrived.
