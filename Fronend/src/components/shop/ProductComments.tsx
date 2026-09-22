import { useSuspenseQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { MessageCircle, Star, CornerDownLeft, ThumbsDown, ThumbsUp, MoreVertical } from "lucide-react";
import { useState } from "react";
import { getProductComments, createProductComment } from "@/lib/shop/api";
import { Button } from "@/components/ui/button";
import type { ProductComment } from "@/lib/shop/types";

const commentsQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ["products", "comments", id],
    queryFn: () => getProductComments({ data: { productId: id } }),
  });

export function ProductComments({ productId }: { productId: number }) {
  const qc = useQueryClient();
  const { data: comments } = useSuspenseQuery(commentsQueryOptions(productId));
  const [text, setText] = useState("");
  const [rate, setRate] = useState(5);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const topLevel = comments.filter((c) => !c.parent);
  const repliesOf = (id: number) => comments.filter((c) => c.parent === id);
  const ratedComments = comments.filter((c) => Number.isFinite(c.rate) && c.rate >= 1 && c.rate <= 5);
  const totalRatings = ratedComments.length;
  const avgRate =
    totalRatings > 0 ? ratedComments.reduce((sum, c) => sum + c.rate, 0) / totalRatings : 0;
  const ratingCounts = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: ratedComments.filter((c) => Math.round(c.rate) === rating).length,
  }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await createProductComment({
        data: { product: productId, text: text.trim(), rate, parent: replyTo },
      });
      setText("");
      setRate(5);
      setReplyTo(null);
      await qc.invalidateQueries({ queryKey: ["products", "comments", productId] });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string) =>
    new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(d));

  return (
    <section className="mt-16 border-t border-border pt-12" dir="rtl">
      <div className="mb-8 flex items-center gap-2 text-xl font-bold">
        <MessageCircle className="h-5 w-5" />
        <h2>نظرات و امتیازها ({comments.length})</h2>
      </div>

      <div className="mb-10 border-y border-border py-7">
        <div className="grid gap-8 md:grid-cols-[180px_minmax(280px,1fr)_180px] md:items-center">
          <div className="flex flex-col items-center justify-center text-center md:order-3">
            {avgRate > 0 ? (
              <>
                <div className="text-5xl font-semibold tracking-tight text-foreground">{avgRate.toFixed(1)}</div>
                <Stars value={Math.round(avgRate)} size="lg" />
                <div className="mt-2 text-sm text-muted-foreground">
                  {new Intl.NumberFormat("fa-IR").format(totalRatings)} نظر
                </div>
              </>
            ) : (
              <>
                <div className="text-5xl font-semibold tracking-tight text-foreground">۰.۰</div>
                <Stars value={0} size="lg" />
                <div className="mt-2 text-sm text-muted-foreground">هنوز نظری ثبت نشده</div>
              </>
            )}
          </div>

          <div className="space-y-2 md:order-2">
            {ratingCounts.map(({ rating, count }) => {
              const percent = totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0;
              return (
                <div key={rating} className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="w-4 shrink-0 text-center">{rating}</span>
                  <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-9 text-left tabular-nums">{percent}٪</span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center md:order-1">
            <Button
              type="button"
              variant="default"
              className="rounded-none px-6"
              onClick={() => document.getElementById("product-comment-form")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            >
              نوشتن نظر
            </Button>
          </div>
        </div>
      </div>

      <form id="product-comment-form" onSubmit={submit} className="mt-6">
        {replyTo && (
          <div className="mb-2 flex items-center justify-between rounded-md bg-secondary px-3 py-2 text-xs">
            <span>در حال پاسخ به نظر #{replyTo}</span>
            <button type="button" onClick={() => setReplyTo(null)} className="text-primary hover:underline">
              انصراف
            </button>
          </div>
        )}
        {!replyTo && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">امتیاز شما:</span>
            <div className="flex flex-row-reverse">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRate(n)}
                  aria-label={`${n} ستاره`}
                  className="p-1"
                >
                  <Star
                    className={`h-5 w-5 transition ${
                      n <= rate ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="نظرتان را درباره این محصول بنویسید..."
          rows={3}
          className="w-full resize-none rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="mt-3 flex justify-end">
          <Button type="submit" size="sm" disabled={submitting || !text.trim()}>
            {submitting ? "در حال ارسال..." : "ثبت نظر"}
          </Button>
        </div>
      </form>

      <div className="mt-8 space-y-6">
        {topLevel.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز نظری ثبت نشده.</p>
        ) : (
          topLevel.map((c) => (
            <div key={c.id} className="space-y-3">
              <CommentItem c={c} onReply={() => setReplyTo(c.id)} formatDate={formatDate} />
              {repliesOf(c.id).length > 0 && (
                <div className="mr-8 space-y-3 border-r-2 border-border pr-4">
                  {repliesOf(c.id).map((r) => (
                    <CommentItem key={r.id} c={r} onReply={() => setReplyTo(c.id)} formatDate={formatDate} isReply />
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

function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "lg" }) {
  return (
    <div className="flex flex-row-reverse items-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size === "lg" ? "h-5 w-5" : "h-4 w-4"} ${n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function CommentItem({
  c,
  onReply,
  formatDate,
  isReply,
}: {
  c: ProductComment;
  onReply: () => void;
  formatDate: (d: string) => string;
  isReply?: boolean;
}) {
  return (
    <article className="border-b border-border pb-6" dir="rtl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="max-w-24 truncate font-medium text-foreground">{c.user}</span>
            <Stars value={c.rate} />
            <span className="font-medium text-foreground">{c.rate}/5</span>
            <span className="text-green-600">|</span>
            <span className="font-medium text-green-600">توصیه می‌کنم</span>
          </div>
          <div className="mt-1 text-xs text-green-600">
            نظر تأییدشده از خرید <span className="text-muted-foreground">• ثبت‌شده در {formatDate(c.create_date)}</span>
          </div>
          <p className="mt-4 text-sm leading-7 text-foreground">{c.text}</p>
        </div>

        <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="گزینه‌های نظر">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <button type="button" className="flex items-center gap-1 hover:text-foreground" aria-label="پسندیدن نظر">
          <ThumbsUp className="h-4 w-4" />
          <span>۰</span>
        </button>
        <button type="button" className="flex items-center gap-1 hover:text-foreground" aria-label="نپسندیدن نظر">
          <ThumbsDown className="h-4 w-4" />
          <span>۰</span>
        </button>
        <button
          type="button"
          onClick={onReply}
          className="mr-auto flex items-center gap-1 text-primary hover:underline"
        >
          <CornerDownLeft className="h-3 w-3" />
          پاسخ
        </button>
      </div>
    </article>
  );
}
