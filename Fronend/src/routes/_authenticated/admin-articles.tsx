import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, MessageSquare, ShieldCheck, Clock3, Plus, RefreshCw, LayoutDashboard, Tags, Pencil } from "lucide-react";
import { getManagedArticles, getArticleReviewQueue, getPendingArticleComments, getArticleCmsCapabilities, decideArticleReview, moderateArticleComment, deleteArticleComment, unpublishManagedArticle, deleteManagedArticle, publishManagedArticle } from "@/lib/shop/api";

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
  const queryClient = useQueryClient();
  const capabilities = useQuery({ queryKey: ["cms", "capabilities"], queryFn: () => getArticleCmsCapabilities() });
  const permissions = capabilities.data?.permissions;
  const articles = useQuery({ queryKey: ["cms", "my-articles"], queryFn: () => getManagedArticles(), enabled: !!(permissions?.create || permissions?.edit_own || permissions?.view_all) });
  const review = useQuery({ queryKey: ["cms", "review-queue"], queryFn: () => getArticleReviewQueue(), enabled: !!permissions?.review });
  const comments = useQuery({ queryKey: ["cms", "pending-comments"], queryFn: () => getPendingArticleComments(), enabled: !!permissions?.moderate_comments });
  const runReview = async (articleId: number, decision: "approve" | "reject") => { await decideArticleReview({ data: { articleId, decision } }); await queryClient.invalidateQueries({ queryKey: ["cms"] }); };
  const runComment = async (commentId: number, status: "approved" | "rejected") => { await moderateArticleComment({ data: { commentId, status } }); await queryClient.invalidateQueries({ queryKey: ["cms"] }); };
  const runDeleteComment = async (commentId: number) => { await deleteArticleComment({ data: { commentId } }); await queryClient.invalidateQueries({ queryKey: ["cms"] }); };
  const runPublish = async (articleId: number) => { await publishManagedArticle({ data: { articleId } }); await queryClient.invalidateQueries({ queryKey: ["cms"] }); };
  const runUnpublish = async (articleId: number) => { await unpublishManagedArticle({ data: { articleId } }); await queryClient.invalidateQueries({ queryKey: ["cms"] }); };
  const runDeleteArticle = async (articleId: number) => { await deleteManagedArticle({ data: { articleId } }); await queryClient.invalidateQueries({ queryKey: ["cms"] }); };

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
          {permissions?.create && <Link to="/admin-article-editor/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90">
            <Plus className="h-4 w-4" /> ایجاد مقاله جدید
          </Link>}
        </div>

        <nav className="mb-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><LayoutDashboard className="h-4 w-4" /> داشبورد</span>
          <a href="#my-articles" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm hover:bg-muted"><FileText className="h-4 w-4" /> فهرست مقاله‌ها</a>
          <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground"><Tags className="h-4 w-4" /> دسته‌بندی و برچسب</span>
          <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground"><MessageSquare className="h-4 w-4" /> دیدگاه‌ها</span>
        </nav>

        {capabilities.isLoading && <p className="mb-5 text-sm text-muted-foreground">در حال دریافت سطح دسترسی…</p>}
        {capabilities.isError && <QueryError message={capabilities.error.message || "دریافت سطح دسترسی ناموفق بود."} retry={() => capabilities.refetch()} />}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(permissions?.create || permissions?.edit_own || permissions?.view_all) && <Metric title={permissions?.view_all ? "همه مقاله‌ها" : "مقاله‌های من"} value={articles.isLoading ? "…" : own.length} icon={FileText} detail={permissions?.view_all ? "مقاله‌های تمام نویسندگان" : "مقاله‌های ثبت‌شده توسط شما"} />}
          <Metric title="پیش‌نویس‌ها" value={articles.isLoading ? "…" : count("draft")} icon={Clock3} detail="قابل ویرایش و ارسال برای بررسی" />
          {permissions?.review && <Metric title="صف بررسی" value={review.isLoading ? "…" : waiting.length} icon={ShieldCheck} detail="نیازمند بررسی ویراستار" />}
          {permissions?.moderate_comments && <Metric title="دیدگاه‌های منتظر" value={comments.isLoading ? "…" : pendingComments.length} icon={MessageSquare} detail="در انتظار تأیید یا رد" />}
        </div>

        {(articles.isError || review.isError || comments.isError) && (
          <div className="mt-6 space-y-3">
            {articles.isError && <QueryError message={articles.error.message || "دریافت مقاله‌ها ناموفق بود."} retry={() => articles.refetch()} />}
            {review.isError && <QueryError message={review.error.message || "دریافت صف بررسی ناموفق بود. ممکن است دسترسی ویراستار نداشته باشید."} retry={() => review.refetch()} />}
            {comments.isError && <QueryError message={comments.error.message || "دریافت دیدگاه‌ها ناموفق بود. ممکن است دسترسی ویراستار نداشته باشید."} retry={() => comments.refetch()} />}
          </div>
        )}

        {permissions?.review && <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4"><h2 className="font-semibold">صف بررسی مقاله‌ها</h2><p className="mt-1 text-xs text-muted-foreground">مقاله‌های ارسال‌شده توسط نویسندگان</p></div>
          {waiting.length === 0 ? <p className="p-6 text-sm text-muted-foreground">مقاله‌ای در انتظار بررسی نیست.</p> : <div className="divide-y divide-border">{waiting.map((article) => <div key={article.id} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><Link to="/admin-article-editor/$articleId" params={{ articleId: String(article.id) }} className="font-medium text-primary hover:underline">{article.title}</Link><p className="mt-1 text-xs text-muted-foreground">نویسنده: {article.author?.username || "نامشخص"}</p></div><div className="flex gap-2"><button onClick={() => runReview(article.id, "approve")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">تأیید</button><button onClick={() => runReview(article.id, "reject")} className="rounded-lg border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive">رد</button></div></div>)}</div>}
        </section>}

        {permissions?.moderate_comments && <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><div className="border-b border-border px-5 py-4"><h2 className="font-semibold">مدیریت دیدگاه‌ها</h2><p className="mt-1 text-xs text-muted-foreground">تأیید یا رد دیدگاه‌های کاربران</p></div>{pendingComments.length === 0 ? <p className="p-6 text-sm text-muted-foreground">دیدگاه در انتظار تأیید وجود ندارد.</p> : <div className="divide-y divide-border">{pendingComments.map((comment) => <div key={comment.id} className="flex flex-wrap items-start justify-between gap-3 p-5"><div className="min-w-0 flex-1"><p className="text-sm leading-7">{comment.text}</p><p className="mt-1 text-xs text-muted-foreground">{comment.user?.username || "کاربر"} · مقاله #{comment.article}</p></div><div className="flex gap-2"><button onClick={() => runComment(comment.id, "approved")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">تأیید</button><button onClick={() => runComment(comment.id, "rejected")} className="rounded-lg border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive">رد</button><button onClick={() => runDeleteComment(comment.id)} className="rounded-lg border border-border px-3 py-2 text-xs">حذف</button></div></div>)}</div>}</section>}

        {(permissions?.create || permissions?.edit_own || permissions?.view_all) && <section id="my-articles" className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
              <p className="mt-1 text-sm text-muted-foreground">برای شروع، اولین مقاله خود را ایجاد کنید.</p>
              <Link to="/admin-article-editor/new" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" /> ایجاد مقاله</Link>
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
                    <td className="px-5 py-4"><div className="flex flex-wrap gap-2"><Link to="/admin-article-editor/$articleId" params={{ articleId: String(article.id) }} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">جزئیات</Link>{article.status === "approved" && permissions?.publish && <button onClick={() => runPublish(article.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">انتشار</button>}{article.status === "published" && permissions?.publish && <button onClick={() => runUnpublish(article.id)} className="rounded-lg border border-border px-3 py-1.5 text-xs">لغو انتشار</button>}{article.status === "draft" && permissions?.edit_own && <button onClick={() => runDeleteArticle(article.id)} className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs text-destructive">حذف</button>}</div></td>
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
