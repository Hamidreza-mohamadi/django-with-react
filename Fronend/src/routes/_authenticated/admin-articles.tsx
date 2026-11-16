import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, MessageSquare, ShieldCheck, Clock3, Plus, RefreshCw, LayoutDashboard, Tags, Pencil } from "lucide-react";
import { getManagedArticles, getArticleReviewQueue, getPendingArticleComments } from "@/lib/shop/api";

export const Route = createFileRoute("/_authenticated/admin-articles")({
  component: ArticleAdminPage,
});

const statusLabels: Record<string, string> = {
  draft: "پیش‌نویس",
  review: "در انتظار بررسی",
  approved: "تأیید شده",
  published: "منتشر شده",
  archived: "بایگانی",
};

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  review: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  approved: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  archived: "bg-muted text-muted-foreground",
};

function Metric({ title, value, icon: Icon, detail }: { title: string; value: number | string; icon: typeof FileText; detail: string }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <span className="rounded-xl bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span>
      </div>
      <div className="mt-4 text-3xl font-bold tabular-nums">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </section>
  );
}

function QueryError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <span>{message}</span>
      <button onClick={retry} className="inline-flex items-center gap-2 font-medium text-primary"><RefreshCw className="h-4 w-4" /> تلاش دوباره</button>
    </div>
  );
}

function ArticleAdminPage() {
  const articles = useQuery({ queryKey: ["cms", "my-articles"], queryFn: () => getManagedArticles() });
  const review = useQuery({ queryKey: ["cms", "review-queue"], queryFn: () => getArticleReviewQueue() });
  const comments = useQuery({ queryKey: ["cms", "pending-comments"], queryFn: () => getPendingArticleComments() });

  const own = articles.data ?? [];
  const waiting = review.data ?? [];
  const pendingComments = comments.data ?? [];
  const count = (status: string) => own.filter((article) => article.status === status).length;
  const formatDate = (value: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(value));

  return (
    <main dir="rtl" className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><LayoutDashboard className="h-4 w-4" /> مدیریت محتوا</div>
            <h1 className="text-3xl font-bold tracking-tight">داشبورد مقاله‌ها</h1>
            <p className="mt-2 text-sm text-muted-foreground">مدیریت نوشته‌ها، بررسی محتوا و نظارت بر دیدگاه‌ها</p>
          </div>
          <Link to="/articles" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90">
            <Plus className="h-4 w-4" /> مشاهده وبلاگ
          </Link>
        </div>

        <nav className="mb-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><LayoutDashboard className="h-4 w-4" /> داشبورد</span>
          <Link to="/admin-articles" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm hover:bg-muted"><FileText className="h-4 w-4" /> مقاله‌ها</Link>
          <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground"><Tags className="h-4 w-4" /> دسته‌بندی و برچسب</span>
          <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground"><MessageSquare className="h-4 w-4" /> دیدگاه‌ها</span>
        </nav>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric title="مقاله‌های من" value={articles.isLoading ? "…" : own.length} icon={FileText} detail="تمام مقاله‌های ثبت‌شده توسط شما" />
          <Metric title="پیش‌نویس‌ها" value={articles.isLoading ? "…" : count("draft")} icon={Clock3} detail="قابل ویرایش و ارسال برای بررسی" />
          <Metric title="صف بررسی" value={review.isLoading ? "…" : waiting.length} icon={ShieldCheck} detail="نیازمند بررسی ویراستار" />
          <Metric title="دیدگاه‌های منتظر" value={comments.isLoading ? "…" : pendingComments.length} icon={MessageSquare} detail="در انتظار تأیید یا رد" />
        </div>

        {(articles.isError || review.isError || comments.isError) && (
          <div className="mt-6 space-y-3">
            {articles.isError && <QueryError message={articles.error.message || "دریافت مقاله‌ها ناموفق بود."} retry={() => articles.refetch()} />}
            {review.isError && <QueryError message={review.error.message || "دریافت صف بررسی ناموفق بود. ممکن است دسترسی ویراستار نداشته باشید."} retry={() => review.refetch()} />}
            {comments.isError && <QueryError message={comments.error.message || "دریافت دیدگاه‌ها ناموفق بود. ممکن است دسترسی ویراستار نداشته باشید."} retry={() => comments.refetch()} />}
          </div>
        )}

        <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="font-semibold">آخرین مقاله‌های من</h2>
              <p className="mt-1 text-xs text-muted-foreground">وضعیت و زمان آخرین تغییر مقاله‌ها</p>
            </div>
            <button onClick={() => articles.refetch()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted"><RefreshCw className="h-3.5 w-3.5" /> بروزرسانی</button>
          </div>
          {articles.isLoading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">در حال دریافت مقاله‌ها…</div>
          ) : own.length === 0 ? (
            <div className="p-10 text-center">
              <FileText className="mx-auto h-9 w-9 text-muted-foreground" />
              <p className="mt-3 font-medium">هنوز مقاله‌ای ثبت نکرده‌اید.</p>
              <p className="mt-1 text-sm text-muted-foreground">برای شروع، اولین مقاله خود را ایجاد کنید.</p>\n              <Link to="/admin-article-editor/new" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" /> ایجاد مقاله</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-right text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">عنوان</th><th className="px-5 py-3 font-medium">وضعیت</th><th className="px-5 py-3 font-medium">آخرین تغییر</th><th className="px-5 py-3 font-medium">عملیات</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {own.map((article) => <tr key={article.id} className="hover:bg-muted/30">
                    <td className="max-w-sm px-5 py-4"><Link to="/admin-article-editor/$articleId" params={{ articleId: String(article.id) }} className="group block"><div className="flex items-center gap-2 truncate font-medium text-primary group-hover:underline">{article.title || "بدون عنوان"} <Pencil className="h-3.5 w-3.5 shrink-0" /></div><div className="mt-1 truncate text-xs text-muted-foreground">{article.short_description}</div></Link></td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[article.status] || "bg-muted"}`}>{statusLabels[article.status] || article.status}</span></td>
                    <td className="px-5 py-4 text-muted-foreground">{formatDate(article.updated_at)}</td>
                    <td className="px-5 py-4"><Link to="/admin-article-editor/$articleId" params={{ articleId: String(article.id) }} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">ویرایش</Link></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-5 text-xs leading-6 text-muted-foreground">دسترسی هر بخش توسط مجوزهای سمت سرور کنترل می‌شود؛ نمایش این داشبورد به‌تنهایی به معنی داشتن مجوز انتشار یا بررسی مقاله نیست.</p>
      </div>
    </main>
  );
}
