import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  User as UserIcon,
  ArrowRight,
  MessageCircle,
  CornerDownLeft,
  Clock,
  Share2,
  Link2,
  BookOpen,
  Tag,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { getArticle, getArticles, getArticleComments, createArticleComment, getManagedArticle } from "@/lib/shop/api";
import type { Article } from "@/lib/shop/types";
import { Button } from "@/components/ui/button";
import type { ArticleComment } from "@/lib/shop/types";

const articleQueryOptions = (slug: string, previewId?: number) =>
  queryOptions({
    queryKey: ["articles", "detail", slug, previewId ?? null],
    queryFn: async () => previewId
      ? await getManagedArticle({ data: { articleId: previewId } }) as unknown as Article
      : getArticle({ data: { slug } }),
  });

const commentsQueryOptions = (slug: string, preview = false) =>
  queryOptions({
    queryKey: ["articles", "comments", slug, preview],
    queryFn: () => preview ? Promise.resolve([]) : getArticleComments({ data: { slug } }),
  });

const articlesListQueryOptions = (preview = false) => queryOptions({
  queryKey: ["articles", "list", preview],
  queryFn: () => preview ? Promise.resolve([]) : getArticles({ data: {} }),
});

export const Route = createFileRoute("/articles/$slug")({
  validateSearch: (search: Record<string, unknown>) => ({
    previewId: typeof search.previewId === "string" && /^\d+$/.test(search.previewId)
      ? Number(search.previewId)
      : typeof search.previewId === "number" && Number.isInteger(search.previewId) ? search.previewId : undefined,
  }),
  loaderDeps: ({ search }) => ({ previewId: search.previewId }),
  loader: async ({ context, params, deps }) => {
    const previewId = deps.previewId;
    const article = await context.queryClient.ensureQueryData(articleQueryOptions(params.slug, previewId));
    if (!previewId) context.queryClient.ensureQueryData(commentsQueryOptions(article.slug));
    if (!previewId) await context.queryClient.ensureQueryData(articlesListQueryOptions());
    return article;
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.title} | مجله فروشگاه` },
            { name: "description", content: loaderData.short_description },
            { property: "og:title", content: loaderData.title },
            { property: "og:description", content: loaderData.short_description },
            { property: "og:type", content: "article" },
            { name: "twitter:card", content: "summary_large_image" },
            ...(loaderData.image
              ? [
                  { property: "og:image", content: loaderData.image },
                  { name: "twitter:image", content: loaderData.image },
                ]
              : []),
          ],
        }
      : { meta: [{ title: "مقاله" }, { name: "robots", content: "noindex" }] },
  component: ArticleDetailPage,
  notFoundComponent: () => (
    <div className="container-shop py-20 text-center" dir="rtl">
      <h1 className="text-2xl font-bold">مقاله پیدا نشد</h1>
    </div>
  ),
});

const formatDate = (d?: string) => d ? new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(d)) : "تاریخ نامشخص";
const MEDIA_BASE_URL = (import.meta.env.VITE_MEDIA_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

function mapArticleImages(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(mapArticleImages);
  if (!value || typeof value !== "object") return value;
  const node = value as Record<string, unknown>;
  const mapped = Object.fromEntries(Object.entries(node).map(([key, item]) => [key, mapArticleImages(item)]));
  if (mapped.type === "image" && mapped.attrs && typeof mapped.attrs === "object") {
    const attrs = mapped.attrs as Record<string, unknown>;
    if (typeof attrs.src === "string" && attrs.src.startsWith("/")) mapped.attrs = { ...attrs, src: `${MEDIA_BASE_URL}${attrs.src}` };
  }
  return mapped;
}

function RichArticleBody({ content }: { content: Record<string, unknown> }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4] } }), Image.configure({ inline: false, allowBase64: false })],
    content: mapArticleImages(content) as never,
    editable: false,
    immediatelyRender: false,
    editorProps: { attributes: { dir: "rtl", class: "prose prose-lg max-w-none text-right leading-9 prose-a:text-primary prose-img:rounded-xl" } },
  });
  return <EditorContent editor={editor} />;
}

const toFa = (n: number) => new Intl.NumberFormat("fa-IR").format(n);

function useReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      setProgress(total > 0 ? Math.min(100, (h.scrollTop / total) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return progress;
}

function ArticleDetailPage() {
  const { slug } = Route.useParams();
  const { previewId } = Route.useSearch();
  const isPreview = !!previewId;
  const { data: article } = useSuspenseQuery(articleQueryOptions(slug, previewId));
  if (!article) throw notFound();

  const { data: comments } = useSuspenseQuery(commentsQueryOptions(article.id, isPreview));
  const { data: allArticles } = useSuspenseQuery(articlesListQueryOptions(isPreview));
  const progress = useReadingProgress();
  const [copied, setCopied] = useState(false);

  const categoryName = isPreview ? "پیش‌نمایش" : typeof article.category === "string"
    ? article.category
    : Array.isArray(article.category)
      ? article.category[0]?.title ?? "بدون دسته‌بندی"
      : article.category?.title ?? "بدون دسته‌بندی";
  const authorName = typeof article.author === "string"
    ? article.author
    : [article.author.first_name, article.author.last_name].filter(Boolean).join(" ") || article.author.username;

  const paragraphs = useMemo(
    () => article.content.split("\n\n").map((p) => p.trim()).filter(Boolean),
    [article.content],
  );
  const readingMinutes = Math.max(1, Math.round(article.content.split(/\s+/).length / 200));

  const related = allArticles
    .filter((a) => a.slug !== article.slug)
    .sort((a) => {
      const cat = typeof a.category === "string" ? a.category : Array.isArray(a.category) ? a.category[0]?.title : a.category?.title;
      return cat === categoryName ? -1 : 1;
    })
    .slice(0, 4);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: article.title, text: article.short_description, url });
        return;
      } catch {
        /* کاربر لغو کرد */
      }
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  console.log("article: ",article);
  console.log("related: ",related);

  return (
    <div dir="rtl">
      {isPreview && <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-900">پیش‌نمایش مقاله — این صفحه فقط برای بررسی مدیران است و مقاله هنوز در سایت منتشر نشده است.</div>}
      {/* نوار پیشرفت مطالعه */}
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent">
        <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>

      {/* هدر مقاله */}
      <header className="border-b border-border bg-secondary/40">
        <div className="container-shop py-8">
          <nav className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">
              خانه
            </Link>
            <span>/</span>
            <Link to="/articles" className="hover:text-primary">
              مقاله‌ها
            </Link>
            <span>/</span>
            <span className="text-foreground">{categoryName}</span>
          </nav>

          <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Tag className="h-3 w-3" />
                {categoryName}
              </span>
              <h1 className="mt-4 text-3xl font-bold leading-tight text-foreground md:text-4xl">
                {article.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                {article.short_description}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  {authorName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(article.pub_date || article.published_at || article.created_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {toFa(readingMinutes)} دقیقه مطالعه
                </span>
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="flex items-center gap-1.5 font-medium text-primary hover:underline"
                >
                  <MessageCircle className="h-4 w-4" />
                  {toFa(comments.reduce((total, comment) => total + 1 + comment.replies.length, 0))} دیدگاه
                </button>

              </div>
            </div>

            {article.image && (
              <div className="overflow-hidden rounded-2xl border border-border bg-secondary">
                <img
                  src={article.image}
                  alt={article.title}
                  className="aspect-[16/10] w-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container-shop py-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* متن مقاله */}
          <div className="min-w-0">
            <article className="max-w-3xl">
              {article.content_json ? (
                <RichArticleBody content={article.content_json} />
              ) : (
                <>
                  <p className="border-r-4 border-primary bg-secondary/50 px-5 py-4 text-base leading-8 text-foreground">
                    {paragraphs[0] ?? article.short_description}
                  </p>
                  <div className="mt-6 space-y-5 text-base leading-9 text-foreground/90">
                    {paragraphs.slice(1).map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                </>
              )}

              <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{authorName}</p>
                    <p className="text-xs text-muted-foreground">نویسنده در مجله فروشگاه</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={share} className="rounded-md">
                  {copied ? <Link2 className="ml-2 h-4 w-4" /> : <Share2 className="ml-2 h-4 w-4" />}
                  {copied ? "لینک کپی شد" : "اشتراک‌گذاری"}
                </Button>
              </div>

              {related.length > 0 && (
                <section className="mt-14 border-t border-border pt-10">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
                    <BookOpen className="h-5 w-5 text-primary" />
                    مقاله‌های پیشنهادی
                  </h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    {related.slice(0, 3).map((a) => (
                      <Link
                        key={a.id}
                        to="/articles/$slug"
                        params={{ slug: a.slug }}
                        className="group overflow-hidden rounded-xl border border-border bg-card"
                      >
                        <img
                          src={a.image || "/placeholder.svg"}
                          alt={a.title}
                          loading="lazy"
                          className="aspect-[16/10] w-full object-cover"
                        />
                        <div className="p-3">
                          <p className="line-clamp-2 text-sm font-medium leading-6 text-foreground group-hover:text-primary">
                            {a.title}
                          </p>
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            {formatDate(a.pub_date || a.published_at || a.created_at)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {!isPreview && <CommentsSection slug={article.slug} comments={comments} />}

            </article>
          </div>

          {/* سایدبار */}
          <aside className="lg:self-start">
            <div className="space-y-5 lg:sticky lg:top-28">
              <Link
                to="/articles"
                className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                <ArrowRight className="h-4 w-4" />
                بازگشت به مقاله‌ها
              </Link>

              {related.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <BookOpen className="h-4 w-4 text-primary" />
                    مقاله‌های مرتبط
                  </h2>
                  <div className="mt-3 space-y-3">
                    {related.map((a) => (
                      <Link
                        key={a.id}
                        to="/articles/$slug"
                        params={{ slug: a.slug }}
                        className="group flex gap-3"
                      >
                        <img
                          src={a.image || "/placeholder.svg"}
                          alt={a.title}
                          loading="lazy"
                          className="h-16 w-20 shrink-0 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-xs font-medium leading-5 text-foreground group-hover:text-primary">
                            {a.title}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(a.pub_date)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-dashed border-border p-4 text-xs leading-6 text-muted-foreground">
                این مطلب برایتان مفید بود؟ آن را با دوستانتان به اشتراک بگذارید یا دیدگاه خود را در انتهای
                صفحه بنویسید.
              </div>

              {/* جایگاه تبلیغات */}
              <div className="flex h-[320px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 p-4 text-center">
                <span className="rounded-full bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                  تبلیغات
                </span>
                <p className="text-xs text-muted-foreground">جایگاه آگهی تبلیغاتی</p>
              </div>

              <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 p-4 text-center">
                <span className="rounded-full bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                  تبلیغات
                </span>
                <p className="text-xs text-muted-foreground">جایگاه آگهی تبلیغاتی</p>
              </div>

            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function CommentsSection({ slug, comments }: { slug: string; comments: ArticleComment[] }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const totalComments = comments.reduce((total, comment) => total + 1 + comment.replies.length, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = text.trim();
    if (!cleanText || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await createArticleComment({
        data: { slug, text: cleanText, parent: replyTo },
      });
      setText("");
      setReplyTo(null);
      setFeedback({ kind: "success", message: result.detail || "دیدگاه شما ثبت شد و پس از بررسی نمایش داده می‌شود." });
      await qc.invalidateQueries({ queryKey: ["articles", "comments", slug] });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error
          ? error.message
          : "ثبت دیدگاه انجام نشد. لطفاً دوباره تلاش کنید.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="comments" className="mt-14 scroll-mt-28 border-t border-border pt-10">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <MessageCircle className="h-5 w-5" />
        دیدگاه‌ها ({toFa(totalComments)})
      </h2>

      <form onSubmit={submit} className="mt-6">
        {replyTo && (
          <div className="mb-2 flex items-center justify-between rounded-md bg-secondary px-3 py-2 text-xs">
            <span>در حال پاسخ به دیدگاه #{toFa(replyTo)}</span>
            <button type="button" onClick={() => setReplyTo(null)} className="text-primary hover:underline">
              انصراف
            </button>
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (feedback) setFeedback(null);
          }}
          placeholder="دیدگاه خود را بنویسید..."
          rows={3}
          maxLength={2000}
          className="w-full resize-none rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {feedback && (
          <p role="status" className={`mt-2 text-sm ${feedback.kind === "success" ? "text-emerald-600" : "text-destructive"}`}>
            {feedback.message}
          </p>
        )}
        <div className="mt-3 flex justify-end">
          <Button type="submit" size="sm" className="rounded-md" disabled={submitting || !text.trim()}>
            {submitting ? "در حال ارسال..." : "ثبت دیدگاه"}
          </Button>
        </div>
      </form>

      <div className="mt-8 space-y-6">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز دیدگاهی ثبت نشده. اولین نفر باشید.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              <CommentItem c={comment} onReply={() => setReplyTo(comment.id)} />
              {comment.replies.length > 0 && (
                <div className="mr-8 space-y-3 border-r-2 border-border pr-4">
                  {comment.replies.map((reply) => (
                    <CommentItem key={reply.id} c={reply} onReply={() => setReplyTo(comment.id)} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function CommentItem({ c, onReply }: { c: ArticleComment; onReply: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
            {(c.user.first_name || c.user.username || "ک").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium">{[c.user.first_name, c.user.last_name].filter(Boolean).join(" ") || c.user.username}</p>
            <p className="text-xs text-muted-foreground">{formatDate(c.create_date)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onReply}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <CornerDownLeft className="h-3 w-3" />
          پاسخ
        </button>
      </div>
      <p className="mt-3 text-sm leading-relaxed">{c.text}</p>
    </div>
  );
}
