import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, MessageSquare, Clock3, Plus, RefreshCw, LayoutDashboard, Tags, Pencil } from "lucide-react";
import { getManagedArticles, getPendingArticleComments, getArticleCmsCapabilities, unpublishManagedArticle, deleteManagedArticle, publishManagedArticle } from "@/lib/shop/api";

export const Route = createFileRoute("/_authenticated/admin-articles")({
  component: ArticleAdminPage,
});

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  review: "bg-muted text-muted-foreground",
  approved: "bg-muted text-muted-foreground",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  archived: "bg-muted text-muted-foreground",
};

function Metric({ title, value, icon: Icon, detail }: { title: string; value: number | string; icon: typeof FileText; detail: string }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
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
  const comments = useQuery({ queryKey: ["cms", "pending-comments"], queryFn: () => getPendingArticleComments(), enabled: !!permissions?.moderate_comments });
  const runPublish = async (articleId: number) => { await publishManagedArticle({ data: { articleId } }); await queryClient.invalidateQueries({ queryKey: ["cms"] }); };
  const runUnpublish = async (articleId: number) => { await unpublishManagedArticle({ data: { articleId } }); await queryClient.invalidateQueries({ queryKey: ["cms"] }); };
  const runDeleteArticle = async (articleId: number) => { await deleteManagedArticle({ data: { articleId } }); await queryClient.invalidateQueries({ queryKey: ["cms"] }); };

  const own = articles.data ?? [];
  const pendingComments = comments.data?.stats.pending ?? 0;
  const waitingPublish = own.filter((article) => article.status === "approved");
  const waitingReview = own.filter((article) => article.status === "review");
  const drafts = own.filter((article) => article.status === "draft");
  const archived = own.filter((article) => article.status === "archived");
  const unpublishedCount = own.filter((article) => article.status !== "published" && article.status !== "archived").length;
  const formatDate = (value: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(value));

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-b from-muted/50 via-background to-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-border bg-card/90 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><LayoutDashboard className="h-4 w-4" /> مدیریت محتوا</div>
            <h1 className="text-3xl font-extrabold tracking-tight">داشبورد مقاله‌ها</h1>
            <p className="mt-2 text-sm text-muted-foreground">مدیریت نوشته‌ها و نظارت بر دیدگاه‌ها</p>
          </div>
          {permissions?.create && <Link to="/admin-article-editor/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/15 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20">
            <Plus className="h-4 w-4" /> ایجاد مقاله جدید
          </Link>}
        </div>

        <nav className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border bg-card/70 p-2 shadow-sm">
          <span className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><LayoutDashboard className="h-4 w-4" /> داشبورد</span>
          <a href="#my-articles" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm hover:bg-muted"><FileText className="h-4 w-4" /> فهرست مقاله‌ها</a>
          <Link to="/admin-taxonomies" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm hover:bg-muted"><Tags className="h-4 w-4" /> دسته‌بندی و برچسب</Link>
          {permissions?.moderate_comments && <Link to="/admin-comments" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm hover:bg-muted"><MessageSquare className="h-4 w-4" /> مدیریت دیدگاه‌ها</Link>}
        </nav>

        {capabilities.isLoading && <p className="mb-5 text-sm text-muted-foreground">در حال دریافت سطح دسترسی…</p>}
        {capabilities.isError && <QueryError message={capabilities.error.message || "دریافت سطح دسترسی ناموفق بود."} retry={() => capabilities.refetch()} />}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(permissions?.create || permissions?.edit_own || permissions?.view_all) && <Metric title={permissions?.view_all ? "همه مقاله‌ها" : "مقاله‌های من"} value={articles.isLoading ? "…" : own.length} icon={FileText} detail={permissions?.view_all ? "مقاله‌های تمام نویسندگان" : "مقاله‌های ثبت‌شده توسط شما"} />}
          <Metric title="مقاله‌های منتشرنشده" value={articles.isLoading ? "…" : unpublishedCount} icon={Clock3} detail="قابل انتشار مستقیم بر اساس سطح دسترسی" />
          {permissions?.moderate_comments && <Metric title="دیدگاه‌های منتظر" value={comments.isLoading ? "…" : pendingComments} icon={MessageSquare} detail="در انتظار تأیید یا رد" />}
        </div>



        {(articles.isError || comments.isError) && (
          <div className="mt-6 space-y-3">
            {articles.isError && <QueryError message={articles.error.message || "دریافت مقاله‌ها ناموفق بود."} retry={() => articles.refetch()} />}
            {comments.isError && <QueryError message={comments.error.message || "دریافت دیدگاه‌ها ناموفق بود. ممکن است دسترسی ویراستار نداشته باشید."} retry={() => comments.refetch()} />}
          </div>
        )}



        {(permissions?.create || permissions?.edit_own || permissions?.view_all) && <section id="my-articles" className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="font-semibold">{permissions?.view_all ? "فهرست همه مقاله‌ها" : "آخرین مقاله‌های من"}</h2>
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
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[article.status] || "bg-muted"}`}>{article.status === "published" ? "منتشر شده" : article.status === "archived" ? "بایگانی" : article.status === "review" ? "در انتظار بررسی" : article.status === "approved" ? (article.scheduled_at ? "زمان‌بندی‌شده" : "آماده انتشار") : "پیش‌نویس"}</span></td>
                    <td className="px-5 py-4 text-muted-foreground">{formatDate(article.updated_at)}</td>
                    <td className="px-5 py-4"><div className="flex flex-wrap gap-2"><Link to="/admin-article-editor/$articleId" params={{ articleId: String(article.id) }} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">جزئیات</Link>{article.status !== "published" && permissions?.publish && <button onClick={() => runPublish(article.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">انتشار</button>}{article.status === "published" && permissions?.publish && <button onClick={() => runUnpublish(article.id)} className="rounded-lg border border-border px-3 py-1.5 text-xs">لغو انتشار</button>}{(permissions?.delete || (article.status === "draft" && permissions?.edit_own)) && <button onClick={() => runDeleteArticle(article.id)} className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs text-destructive">حذف</button>}</div></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          )}
        </section>}

        {(permissions?.create || permissions?.edit_own || permissions?.view_all || permissions?.publish || permissions?.review) && <section className="mt-8 space-y-5">
          <div><h2 className="text-xl font-bold">صف‌های کاری مقاله‌ها</h2><p className="mt-1 text-sm text-muted-foreground">هر بخش مانند فهرست همه مقاله‌ها، در یک جدول مستقل نمایش داده می‌شود.</p></div>
          {[
            { key: "approved", title: "در انتظار انتشار", items: waitingPublish },
            { key: "review", title: "در انتظار بررسی", items: waitingReview },
            { key: "draft", title: "پیش‌نویس‌ها", items: drafts },
            { key: "archived", title: "بایگانی", items: archived },
          ].map((queue) => <section key={queue.key} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div><h3 className="font-semibold">{queue.title}</h3><p className="mt-1 text-xs text-muted-foreground">وضعیت و زمان آخرین تغییر مقاله‌ها</p></div>
              <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold">{queue.items.length}</span>
            </div>
            {articles.isLoading ? <div className="p-10 text-center text-sm text-muted-foreground">در حال دریافت مقاله‌ها…</div> : queue.items.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">مقاله‌ای در این بخش وجود ندارد.</div> : <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-right text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">عنوان</th><th className="px-5 py-3 font-medium">وضعیت</th><th className="px-5 py-3 font-medium">آخرین تغییر</th><th className="px-5 py-3 font-medium">عملیات</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {queue.items.map((article) => <tr key={article.id} className="hover:bg-muted/30">
                    <td className="max-w-sm px-5 py-4"><Link to="/admin-article-editor/$articleId" params={{ articleId: String(article.id) }} className="group block"><div className="flex items-center gap-2 truncate font-medium text-primary group-hover:underline">{article.title || "بدون عنوان"} <Pencil className="h-3.5 w-3.5 shrink-0" /></div><div className="mt-1 truncate text-xs text-muted-foreground">{article.short_description}</div></Link></td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[article.status] || "bg-muted"}`}>{article.status === "approved" ? (article.scheduled_at ? "زمان‌بندی‌شده" : "آماده انتشار") : article.status === "review" ? "در انتظار بررسی" : article.status === "archived" ? "بایگانی" : "پیش‌نویس"}</span></td>
                    <td className="px-5 py-4 text-muted-foreground">{formatDate(article.updated_at)}</td>
                    <td className="px-5 py-4"><div className="flex flex-wrap gap-2"><Link to="/admin-article-editor/$articleId" params={{ articleId: String(article.id) }} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">جزئیات</Link>{queue.key === "approved" && permissions?.publish && <button onClick={() => runPublish(article.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">منتشر کردن</button>}{queue.key === "review" && permissions?.review && <Link to="/admin-article-editor/$articleId" params={{ articleId: String(article.id) }} className="rounded-lg border border-sky-500/30 px-3 py-1.5 text-xs text-sky-700 hover:bg-sky-500/10">بررسی مقاله</Link>}</div></td>
                  </tr>)}
                </tbody>
              </table>
            </div>}
          </section>)}
        </section>}

        <p className="mt-5 text-xs leading-6 text-muted-foreground">دسترسی هر عملیات توسط مجوزهای سمت سرور کنترل می‌شود؛ هر نقش فقط امکانات مجاز خودش و نقش‌های پایین‌تر را دارد.</p>
      </div>
    </main>
  );
}
