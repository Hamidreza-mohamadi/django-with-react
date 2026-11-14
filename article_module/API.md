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

## Author workflow

Requires article_module.add_article to create and article_module.change_article to edit/submit.

| Method | Endpoint | Description |
|---|---|---|
| GET, POST | manage/ | List own articles / create draft |
| GET, PATCH | manage/<id>/ | Read or edit own draft |
| POST | manage/<id>/submit/ | Submit draft for review |
| POST | manage/<id>/images/ | Upload an inline image to own draft (multipart: image, optional alt_text) |

Inline image uploads are limited to 5 MiB and must be valid image files. The response URL is a relative media URL. Only images uploaded to that article may be referenced by its content_json.

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

## Review, publication, and comments moderation

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | review/ | review_article | Review queue |
| POST | review/<id>/decision/ | review_article | JSON decision: approve or reject |
| POST | publish/<id>/ | publish_article | Publish approved article or provide future scheduled_at |
| GET | manage/comments/ | review_article | Pending comments |
| PATCH | manage/comments/<id>/ | review_article | Approve or reject a comment |

Comments are submitted by authenticated users and are not public until approved. Replies are limited to one level. Anti-spam throttling and reporting are not yet implemented.
