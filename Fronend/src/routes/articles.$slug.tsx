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
import { getArticle, getArticles, getArticleComments, createArticleComment } from "@/lib/shop/api";
import { Button } from "@/components/ui/button";
import type { ArticleComment } from "@/lib/shop/types";

const articleQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["articles", "detail", slug],
    queryFn: () => getArticle({ data: { slug } }),
  });

const commentsQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ["articles", "comments", id],
    queryFn: () => getArticleComments({ data: { articleId: id } }),
  });

const articlesListQueryOptions = queryOptions({
  queryKey: ["articles", "list"],
  queryFn: () => getArticles({ data: {} }),
});

export const Route = createFileRoute("/articles/$slug")({
  loader: async ({ context, params }) => {
    const article = await context.queryClient.ensureQueryData(articleQueryOptions(params.slug));
    context.queryClient.ensureQueryData(commentsQueryOptions(article.id));
    context.queryClient.ensureQueryData(articlesListQueryOptions);
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

const formatDate = (d: string) =>
  new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(d));

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
  const { data: article } = useSuspenseQuery(articleQueryOptions(slug));
  if (!article) throw notFound();

  const { data: comments } = useSuspenseQuery(commentsQueryOptions(article.id));
  const { data: allArticles } = useSuspenseQuery(articlesListQueryOptions);
  const progress = useReadingProgress();
  const [copied, setCopied] = useState(false);

  const categoryName = typeof article.category === "string" ? article.category : article.category.title;

  const paragraphs = useMemo(
    () => article.content.split("\n\n").map((p) => p.trim()).filter(Boolean),
    [article.content],
  );
  const readingMinutes = Math.max(1, Math.round(article.content.split(/\s+/).length / 200));

  const related = allArticles
    .filter((a) => a.slug !== article.slug)
    .sort((a) => {
      const cat = typeof a.category === "string" ? a.category : a.category.title;
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
                  {article.author.last_name}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(article.pub_date)}
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
                  {toFa(comments.length)} دیدگاه
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
              <p className="border-r-4 border-primary bg-secondary/50 px-5 py-4 text-base leading-8 text-foreground">
                {paragraphs[0] ?? article.short_description}
              </p>

              <div className="mt-6 space-y-5 text-base leading-9 text-foreground/90">
                {paragraphs.slice(1).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{article.author.last_name}</p>
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
                            {formatDate(a.pub_date)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <CommentsSection articleId={article.id} comments={comments} />

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

function CommentsSection({ articleId, comments }: { articleId: number; comments: ArticleComment[] }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const topLevel = comments.filter((c) => !c.parent);
  const repliesOf = (id: number) => comments.filter((c) => c.parent === id);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await createArticleComment({ data: { article: articleId, text: text.trim(), parent: replyTo } });
      setText("");
      setReplyTo(null);
      await qc.invalidateQueries({ queryKey: ["articles", "comments", articleId] });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="comments" className="mt-14 scroll-mt-28 border-t border-border pt-10">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <MessageCircle className="h-5 w-5" />
        دیدگاه‌ها ({toFa(comments.length)})
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
          onChange={(e) => setText(e.target.value)}
          placeholder="دیدگاه خود را بنویسید..."
          rows={3}
          className="w-full resize-none rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="mt-3 flex justify-end">
          <Button type="submit" size="sm" className="rounded-md" disabled={submitting || !text.trim()}>
            {submitting ? "در حال ارسال..." : "ثبت دیدگاه"}
          </Button>
        </div>
      </form>

      <div className="mt-8 space-y-6">
        {topLevel.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز دیدگاهی ثبت نشده. اولین نفر باشید.</p>
        ) : (
          topLevel.map((c) => (
            <div key={c.id} className="space-y-3">
              <CommentItem c={c} onReply={() => setReplyTo(c.id)} />
              {repliesOf(c.id).length > 0 && (
                <div className="mr-8 space-y-3 border-r-2 border-border pr-4">
                  {repliesOf(c.id).map((r) => (
                    <CommentItem key={r.id} c={r} onReply={() => setReplyTo(c.id)} />
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
            {c.user.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium">{c.user}</p>
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
