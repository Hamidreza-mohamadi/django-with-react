import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/favorites")({
  component: FavoritesPage,
  head: () => ({
    meta: [
      { title: "علاقه‌مندی‌ها | فروشگاه" },
      { name: "description", content: "فهرست محصولاتی که به علاقه‌مندی‌های خود اضافه کرده‌اید." },
      { property: "og:title", content: "علاقه‌مندی‌ها | فروشگاه" },
      { property: "og:description", content: "فهرست محصولات مورد علاقه شما در فروشگاه." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function FavoritesPage() {
  const { favorites } = useFavorites();

  return (
    <div className="container-shop py-8" dir="rtl">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
        <Heart className="h-6 w-6 text-destructive" />
        علاقه‌مندی‌ها
      </h1>

      {favorites.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">هنوز محصولی به علاقه‌مندی‌ها اضافه نکرده‌اید.</p>
          <Button asChild className="mt-4 rounded-md">
            <Link to="/products">مشاهده محصولات</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {favorites.map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      )}
    </div>
  );
}
