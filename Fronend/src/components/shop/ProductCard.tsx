import { Link } from "@tanstack/react-router";
import { ShoppingCart, PackageX, PackageCheck, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useFavorites } from "@/hooks/use-favorites";
import { StarRating } from "@/components/shop/StarRating";
import { StrikePrice } from "@/components/shop/StrikePrice";
import type { Product } from "@/lib/shop/types";

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(product.id);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("fa-IR").format(price);

  const hasDiscount = !!product.compare_price && product.compare_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_price! - product.price) / product.compare_price!) * 100)
    : 0;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-sm">
      <Link
        to="/products/$productId"
        params={{ productId: product.slug }}
        className={`relative overflow-hidden bg-secondary ${compact ? "aspect-[4/3]" : "aspect-[5/4]"}`}
      >
        <img
          src={product.image || "/placeholder.svg"}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </Link>

      <button
        type="button"
        onClick={() => toggleFavorite(product)}
        aria-label={favorite ? `حذف ${product.name} از علاقه‌مندی‌ها` : `افزودن ${product.name} به علاقه‌مندی‌ها`}
        aria-pressed={favorite}
        className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-muted-foreground shadow-sm backdrop-blur transition hover:text-destructive"
      >
        <Heart className={`h-4 w-4 ${favorite ? "fill-destructive text-destructive" : ""}`} />
      </button>

      <div className={`flex flex-1 flex-col ${compact ? "p-3" : "p-4"}`}>
        <Link
          to="/products/$productId"
          params={{ productId: product.slug }}
          className={`text-foreground hover:text-primary ${compact ? "text-sm line-clamp-1" : "text-base"}`}
        >
          {product.name}
        </Link>
        <p className={`mt-1 line-clamp-2 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
          {product.description}
        </p>
        <div className="mt-1 flex w-full justify-end text-right">
          <StarRating rating={product.rating ?? 0} count={product.reviews_count ?? 0} />
        </div>

        {product.stock > 0 && product.is_available ? (
          product.stock < 4 ? (
            <span className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-destructive">
              <PackageCheck className="h-3.5 w-3.5" />
              {formatPrice(product.stock)} عدد موجود در انبار
            </span>
          ) : (
            <span className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <PackageCheck className="h-3.5 w-3.5 text-green-600" />
              موجود در انبار
            </span>
          )
        ) : (
          <span className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-destructive">
            <PackageX className="h-3.5 w-3.5" />
            ناموجود
          </span>
        )}

        <div className={`mt-auto ${compact ? "pt-3" : "pt-4"}`}>
          <div className="flex items-end justify-between gap-2">
            <div className="flex flex-col gap-1">
              <span className={`font-bold text-foreground ${compact ? "text-sm" : "text-lg"}`}>
                {formatPrice(product.price)} تومان
              </span>
              {hasDiscount && (
                <span className="flex items-center gap-2">
                  <StrikePrice value={formatPrice(product.compare_price!)} className="text-[13px]" />
                  <span className="rounded-md bg-green-600 px-1.5 py-0.5 text-[12px] font-bold text-white">
                    {formatPrice(discountPercent)}٪
                  </span>
                </span>
              )}
            </div>

            <Button
              size="icon"
              className={`shrink-0 rounded-md ${compact ? "h-8 w-8" : ""}`}
              onClick={() => addItem(product)}
              aria-label={`افزودن ${product.name} به سبد خرید`}
            >
              <ShoppingCart className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
