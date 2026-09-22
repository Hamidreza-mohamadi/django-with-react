import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: "sm" | "md";
}

export function StarRating({ rating, count, size = "sm" }: StarRatingProps) {
  const starClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const value = Math.max(0, Math.min(5, rating));

  return (
    <span className="flex items-center gap-1" dir="rtl">
      <span className="flex items-center">
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, value - i));
          return (
            <span key={i} className="relative inline-block">
              <Star className={`${starClass} text-muted-foreground/30`} />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star className={`${starClass} fill-yellow-400 text-yellow-400`} />
              </span>
            </span>
          );
        })}
      </span>
      <span className="text-[11px] font-medium text-foreground">
        {value.toFixed(1)}
        {count !== undefined && (
          <span className="text-muted-foreground"> ({new Intl.NumberFormat("fa-IR").format(count)})</span>
        )}
      </span>
    </span>
  );
}
