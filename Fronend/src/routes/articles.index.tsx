import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Calendar, User as UserIcon, ArrowLeft } from "lucide-react";
import { getArticles } from "@/lib/shop/api";

const articlesQueryOptions = queryOptions({
  queryKey: ["articles", "list"],
  queryFn: () => getArticles({ data: {} }),
});

export const Route = createFileRoute("/articles/")({
  head: () => ({
    meta: [
      { title: "مقاله‌ها | فروشگاه" },
      { name: "description", content: "آخرین مقاله‌ها و راهنماهای خرید فروشگاه." },
      { property: "og:title", content: "مقاله‌ها | فروشگاه" },
      { property: "og:description", content: "آخرین مقاله‌ها و راهنماهای خرید فروشگاه." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(articlesQueryOptions),
  component: ArticlesListPage,
});

function ArticlesListPage() {
  const { data: articles } = useSuspenseQuery(articlesQueryOptions);
  const formatDate = (d: string) =>
    new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(d));

  return (
    <div className="container-shop py-8" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">مقاله‌ها</h1>
        <p className="mt-2 text-muted-foreground">راهنماها، اخبار و مطالب خواندنی.</p>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 py-20 text-center">
          <p className="text-muted-foreground">مقاله‌ای یافت نشد.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link
              key={article.id}
              to="/articles/$slug"
              params={{ slug: article.slug }}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="aspect-[16/10] overflow-hidden bg-secondary">
                <img
                  src={article.image || "/placeholder.svg"}
                  alt={article.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span className="text-xs font-medium text-primary">
                  {typeof article.category === "string" ? article.category : article.category.title}
                </span>
                <h2 className="mt-2 text-lg font-semibold leading-snug text-foreground group-hover:text-primary">
                  {article.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{article.short_description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      {article.author.last_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(article.pub_date)}
                    </span>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-primary transition-transform group-hover:-translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
