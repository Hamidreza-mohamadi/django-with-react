import { Link } from "@tanstack/react-router";
import type { Article } from "@/lib/shop/types";

export function ArticleMiniCard({ article }: { article: Article }) {
  const date = new Date(article.pub_date).toLocaleDateString("fa-IR");

  return (
    <Link
      to="/articles/$slug"
      params={{ slug: article.slug }}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-sm"
    >
      <div className="aspect-[16/10] overflow-hidden bg-secondary">
        <img
          src={article.image || "/placeholder.svg"}
          alt={article.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="flex flex-1 flex-col p-3">
        <span className="text-[11px] text-muted-foreground">
          {typeof article.category === "string" ? article.category : article.category?.name}
        </span>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary">
          {article.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {article.short_description}
        </p>
        <div className="mt-auto pt-3 text-[11px] text-muted-foreground">
          {article.author.last_name} · {date}
        </div>
      </div>
    </Link>
  );
}
