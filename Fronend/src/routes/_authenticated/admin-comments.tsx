import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clock3, MessageSquare, RotateCcw, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getManagedArticleComments,
  moderateArticleComment,
  deleteArticleComment,
} from "@/lib/shop/api";
import type { ManagedArticleComment } from "@/lib/shop/api";

export const Route = createFileRoute("/_authenticated/admin-comments")({
  validateSearch: (search: Record<string, unknown>) => ({
    article: typeof search.article === "string" && /^\\d+$/.test(search.article)
      ? Number(search.article)
      : typeof search.article === "number" && Number.isInteger(search.article) ? search.article : undefined,
  }),
  component: AdminCommentsPage,
});

const statusLabels = {
  pending: "در انتظار تأیید",
  approved: "تأییدشده",
  rejected: "ردشده",
} as const;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

function AdminCommentsPage() {
  const { article } = Route.useSearch();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const commentsQuery = useQuery({
    queryKey: ["cms", "comments", { article, statusFilter, search, page }],
    queryFn: () => getManagedArticleComments({
      data: { article, status: statusFilter, search: search.trim(), page, page_size: 20 },
    }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["cms", "comments"] });
  const statusMutation = useMutation({
    mutationFn: ({ commentId, status }: { commentId: number; status: "pending" | "approved" | "rejected" }) =>
      moderateArticleComment({ data: { commentId, status } }),
    onSuccess: refresh,
  });
  const deleteMutation = useMutation({
    mutationFn: ({ commentId, cascade }: { commentId: number; cascade?: boolean }) =>
      deleteArticleComment({ data: { commentId, cascade } }),
    onSuccess: refresh,
  });

  const data = commentsQuery.data;
  const pageCount = Math.max(1, Math.ceil((data?.count ?? 0) / 20));
  const busy = statusMutation.isPending || deleteMutation.isPending;
  const mutationError = statusMutation.error ?? deleteMutation.error;

  const changeStatus = (comment: ManagedArticleComment, status: "pending" | "approved" | "rejected") => {
    statusMutation.mutate({ commentId: comment.id, status });
  };

  const removeComment = (comment: ManagedArticleComment) => {
    const hasReplies = comment.replies?.length > 0;
    const message = hasReplies
      ? "این دیدگاه پاسخ دارد. با حذف آن، خود دیدگاه و تمام پاسخ‌هایش حذف می‌شوند. ادامه می‌دهید؟"
      : "این دیدگاه برای همیشه حذف شود؟";
    if (!window.confirm(message)) return;
    deleteMutation.mutate({ commentId: comment.id, cascade: hasReplies });
  };

  const flattenReplies = (comment: ManagedArticleComment): ManagedArticleComment[] => {
    const replies: ManagedArticleComment[] = [];
    const collect = (items: ManagedArticleComment[]) => {
      for (const item of items) {
        replies.push(item);
        collect(item.replies ?? []);
      }
    };
    collect(comment.replies ?? []);
    return replies.sort((a, b) =>
      new Date(a.create_date).getTime() - new Date(b.create_date).getTime() || a.id - b.id
    );
  };

  /*
   * روش قبلی نمایش تو‌در‌تو؛ برای بازگشت، منطق renderComment بازگشتی قبلی را فعال کنید.
   *
   * const renderComment = (comment: ManagedArticleComment, isReply = false) => (
   *   <article key={comment.id} className={`rounded-xl border border-border bg-card p-4 ${isReply ? "bg-muted/30" : ""}`}>
   *     ... نمایش مشخصات و عملیات دیدگاه ...
   *     {comment.replies?.length > 0 && (
   *       <div className={isReply ? "-mx-4 mt-4 space-y-3" : "mr-3 mt-4 space-y-3 border-r-2 border-border pr-4"}>
   *         {!isReply && <p className="text-xs font-semibold text-muted-foreground">پاسخ‌ها ({comment.replies.length})</p>}
   *         {comment.replies.map((reply) => renderComment(reply, true))}
   *       </div>
   *     )}
   *   </article>
   * );
   */

  const renderComment = (comment: ManagedArticleComment, isReply = false) => (
    <article key={comment.id} className={`rounded-xl border border-border bg-card p-4 ${isReply ? "bg-muted/30" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm">{[comment.user.first_name, comment.user.last_name].filter(Boolean).join(" ") || comment.user.username}</strong>
            <span className="text-xs text-muted-foreground">@{comment.user.username}</span>
            <span className={`rounded-full px-2 py-1 text-[11px] ${comment.status === "pending" ? "bg-amber-100 text-amber-800" : comment.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
              {statusLabels[comment.status]}
            </span>
            {isReply && <span className="text-xs text-muted-foreground">پاسخ به {comment.parent_user ? ([comment.parent_user.first_name, comment.parent_user.last_name].filter(Boolean).join(" ") || comment.parent_user.username) + " (@" + comment.parent_user.username + ")" : "دیدگاه #" + comment.parent}</span>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(comment.create_date)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {comment.status !== "approved" && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => changeStatus(comment, "approved")} title="تأیید دیدگاه">
              <Check className="ml-1 h-4 w-4" /> تأیید
            </Button>
          )}
          {comment.status !== "rejected" && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => changeStatus(comment, "rejected")} title="رد دیدگاه">
              <X className="ml-1 h-4 w-4" /> رد
            </Button>
          )}
          {comment.status === "rejected" && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => changeStatus(comment, "pending")} title="بازگردانی به صف بررسی">
              <RotateCcw className="ml-1 h-4 w-4" /> بازگردانی
            </Button>
          )}
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => removeComment(comment)} title="حذف دیدگاه">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-7">{comment.text}</p>
    </article>
  );

  return (
    <main dir="rtl" className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">مدیریت دیدگاه‌ها</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {article ? `دیدگاه‌های مقاله با شناسه #${article}` : "مدیریت و بررسی دیدگاه‌های تمام مقاله‌ها"}
            </p>
          </div>
          {article && <a href="/admin-comments" className="text-sm text-primary hover:underline">نمایش همه مقاله‌ها</a>}
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ["total", "همه دیدگاه‌ها", MessageSquare],
            ["pending", "در انتظار تأیید", Clock3],
            ["approved", "تأییدشده", Check],
            ["rejected", "ردشده", X],
          ] as const).map(([key, label, Icon]) => (
            <div key={key} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                {label}<Icon className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">{new Intl.NumberFormat("fa-IR").format(data?.stats[key] ?? 0)}</p>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="جست‌وجو در متن، نام کاربر یا عنوان مقاله" className="w-full rounded-md border border-input bg-background py-2 pr-9 pl-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setPage(1); }} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="all">همه وضعیت‌ها</option>
            <option value="pending">در انتظار تأیید</option>
            <option value="approved">تأییدشده</option>
            <option value="rejected">ردشده</option>
          </select>
        </div>

        {statusMutation.isError || deleteMutation.isError ? (
          <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {mutationError instanceof Error
              ? mutationError.message
              : "عملیات انجام نشد. دوباره تلاش کنید."}
          </p>
        ) : null}

        <div className="mt-5 space-y-4">
          {commentsQuery.isLoading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">در حال دریافت دیدگاه‌ها...</p>
          ) : commentsQuery.isError ? (
            <p role="alert" className="py-12 text-center text-sm text-destructive">دریافت دیدگاه‌ها با خطا مواجه شد.</p>
          ) : data?.results.length ? (
            data.results.map((comment) => (
              <div key={comment.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-muted-foreground">
                  <span>مقاله: <strong className="text-foreground">{comment.article_title}</strong></span>
                  <span>·</span><span>#{comment.article}</span>
                  <a href={`/articles/${comment.article_slug}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">مشاهده مقاله</a>
                </div>
                {renderComment(comment)}
                {flattenReplies(comment).length > 0 && (
                  <div className="mr-3 space-y-3 border-r-2 border-border pr-4">
                    <p className="text-xs font-semibold text-muted-foreground">پاسخ‌ها ({flattenReplies(comment).length})</p>
                    {flattenReplies(comment).map((reply) => renderComment(reply, true))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">دیدگاهی با این شرایط پیدا نشد.</div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">صفحه {new Intl.NumberFormat("fa-IR").format(page)} از {new Intl.NumberFormat("fa-IR").format(pageCount)} · {new Intl.NumberFormat("fa-IR").format(data?.count ?? 0)} گفت‌وگو</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || commentsQuery.isFetching} onClick={() => setPage((value) => value - 1)}>
              <ChevronRight className="ml-1 h-4 w-4" /> قبلی
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pageCount || commentsQuery.isFetching} onClick={() => setPage((value) => value + 1)}>
              بعدی <ChevronLeft className="mr-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
