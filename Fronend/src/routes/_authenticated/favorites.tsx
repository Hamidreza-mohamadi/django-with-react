import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/favorites")({
  component: FavoritesPage,
});

function FavoritesPage() {
  const { favorites, removeFavorite, isLoading } = useFavorites();
  const { addItem } = useCart();
  const formatPrice = (price: number) => new Intl.NumberFormat("fa-IR").format(price);

  return (
    <div className="container-shop min-h-[60vh] py-10" dir="rtl">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500"><Heart className="h-6 w-6" /></div>
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">علاقه‌مندی‌های من</h1>
          <p className="mt-1 text-sm text-muted-foreground">{new Intl.NumberFormat("fa-IR").format(favorites.length)} محصول ذخیره‌شده</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center text-muted-foreground">در حال دریافت علاقه‌مندی‌ها...</div>
      ) : favorites.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((product) => (
            <article key={product.id} className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/30">
              <Link to="/products/$productId" params={{ productId: product.slug }} className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-secondary">
                <img src={product.image || "/placeholder.svg"} alt={product.name} className="h-full w-full object-cover" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link to="/products/$productId" params={{ productId: product.slug }} className="line-clamp-2 font-semibold text-foreground hover:text-primary">{product.name}</Link>
                <p className="mt-2 font-bold text-foreground">{formatPrice(product.price)} تومان</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-3">
                  <Button size="sm" onClick={() => addItem(product)} disabled={!product.is_available}><ShoppingBag className="ml-1 h-4 w-4" /> افزودن به سبد</Button>
                  <Button size="sm" variant="outline" onClick={() => removeFavorite(product.id)} aria-label="حذف از علاقه‌مندی‌ها"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-secondary/20 px-6 py-16 text-center">
          <Heart className="h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-xl font-bold text-foreground">هنوز محصولی ذخیره نکرده‌ای</h2>
          <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">در صفحه محصولات، روی قلب کنار محصول بزن تا بعداً راحت‌تر پیدایش کنی.</p>
          <Button asChild className="mt-5"><Link to="/products">دیدن محصولات</Link></Button>
        </div>
      )}
    </div>
  );
}
