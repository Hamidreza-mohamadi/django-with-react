import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface SectionCarouselProps<T> {
  title: string;
  items: T[];
  perPage?: number;
  renderItem: (item: T) => ReactNode;
  viewAll: { to: string; search?: Record<string, string> };
}

export function SectionCarousel<T>({
  title,
  items,
  perPage = 4,
  renderItem,
  viewAll,
}: SectionCarouselProps<T>) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / perPage));
  const pages = Array.from({ length: pageCount }, (_, p) =>
    items.slice(p * perPage, p * perPage + perPage),
  );

  const atStart = page === 0;
  const atEnd = page === pageCount - 1;
  const go = (dir: number) =>
    setPage((p) => Math.min(pageCount - 1, Math.max(0, p + dir)));

  return (
    <section className="container-shop">
      <div className="rounded-2xl border border-secondary/40 bg-secondary/40 p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-foreground md:text-2xl">{title}</h2>
          <Link
            to={viewAll.to}
            search={viewAll.search}
            className="flex items-center text-sm font-medium text-primary hover:underline"
          >
            مشاهده همه
            <ArrowLeft className="mr-1 h-4 w-4" />
          </Link>
        </div>

        <div className="relative">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(${page * 100}%)` }}
            >
              {pages.map((group, p) => (
                <div
                  key={p}
                  className="grid w-full shrink-0 grid-cols-2 gap-4 lg:grid-cols-4"
                >
                  {group.map((item, i) => (
                    <div key={i}>{renderItem(item)}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {pageCount > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={atStart}
                aria-label="قبلی"
                className="absolute -right-3 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:text-foreground disabled:pointer-events-none disabled:opacity-40 md:-right-4"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                disabled={atEnd}
                aria-label="بعدی"
                className="absolute -left-3 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:text-foreground disabled:pointer-events-none disabled:opacity-40 md:-left-4"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
