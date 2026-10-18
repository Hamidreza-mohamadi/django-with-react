import { createFileRoute, notFound, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Minus, Plus, ShoppingCart, Truck, ShieldCheck, RotateCcw, Store, Package, CreditCard, Headphones, Heart } from "lucide-react";
import { useState } from "react";
import { getProduct, getProductComments, getProducts } from "@/lib/shop/api";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { Button } from "@/components/ui/button";
import { ProductComments } from "@/components/shop/ProductComments";
import { StarRating } from "@/components/shop/StarRating";
import { ProductCard } from "@/components/shop/ProductCard";

const productQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["products", "detail", slug],
    queryFn: () => getProduct({ data: { slug } }),
  });

const productCommentsQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ["products", "comments", id],
    queryFn: () => getProductComments({ data: { productId: id } }),
  });

const relatedQueryOptions = () =>
  queryOptions({
    queryKey: ["products", "related", "all"],
    queryFn: () => getProducts({ data: {} }),
  });

export const Route = createFileRoute("/products/$productId")({
  loader: async ({ context, params }) => {
    const product = await context.queryClient.ensureQueryData(productQueryOptions(params.productId));
    await Promise.all([
      context.queryClient.ensureQueryData(productCommentsQueryOptions(product.id)),
      context.queryClient.ensureQueryData(relatedQueryOptions()),
    ]);
  },
  component: ProductDetailPage,
  head: () => ({
    meta: [
      { title: "جزئیات محصول | فروشگاه" },
      { name: "description", content: "مشخصات کامل، تصاویر، ویژگی‌ها و نظرات خریداران این محصول." },
      { property: "og:title", content: "جزئیات محصول | فروشگاه" },
      { property: "og:description", content: "مشخصات کامل، تصاویر، ویژگی‌ها و نظرات خریداران این محصول." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  notFoundComponent: () => (
    <div className="container-shop py-20 text-center" dir="rtl">
      <h1 className="text-2xl font-bold">محصول پیدا نشد</h1>
      <p className="mt-2 text-muted-foreground">محصول مورد نظر شما وجود ندارد یا حذف شده است.</p>
    </div>
  ),
});

const formatPrice = (price: number) => new Intl.NumberFormat("fa-IR").format(price);

function ProductDetailPage() {
  
  const { productId } = Route.useParams();
  const { data: product } = useSuspenseQuery(productQueryOptions(productId));
  const { data: comments } = useSuspenseQuery(productCommentsQueryOptions(product.id));
  const { data: relatedPage } = useSuspenseQuery(relatedQueryOptions());
  const related = relatedPage?.results ?? [];
  const { addItem } = useCart();
  const { isAuthenticated, isLoading } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const gallery = product.images?.length ? product.images : [product.image || "/placeholder.svg"];
  const [activeImage, setActiveImage] = useState(gallery[0]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const availableVariants = (product.variants ?? []).filter((variant) => variant.is_active);
  const selectedVariant = availableVariants.find((variant) => variant.id === selectedVariantId) ?? availableVariants[0];
  const displayPrice = selectedVariant?.price ?? product.price;
  const comparePrice = selectedVariant && selectedVariant.regular_price > displayPrice
    ? selectedVariant.regular_price
    : product.compare_price;


  if (!product) throw notFound();

  const rating = product.rating ?? 0;
  const reviewsCount = comments.length || product.reviews_count || 0;
  const discountPercent =
    comparePrice && comparePrice > displayPrice
      ? Math.round(((comparePrice - displayPrice) / comparePrice) * 100)
      : 0;
  const others = related.filter((p) => p.id !== product.id);
  const sameCategory = others.filter((p) => p.category?.slug === product.category?.slug);
  const suggestions = [
    ...sameCategory,
    ...others.filter((p) => !sameCategory.includes(p)),
  ].slice(0, 8);

  const scrollToComments = () => {
    document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" });
  }; 

  return (
    <div className="container-shop py-5" dir="rtl">
      {/* مسیر دسته‌بندی */}
      <nav className="mb-7 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-secondary/40 px-5 py-4 text-[15px] text-muted-foreground">
        <Link to="/" className="transition-colors hover:text-sky-500">خانه</Link>
        <span className="text-muted-foreground/40">›</span>
        <Link to="/products" className="transition-colors hover:text-sky-500">دسته‌بندی</Link>
        {product.category && (
          <>
            <span className="text-muted-foreground/40">›</span>
            <Link
              to="/products"
              search={{ category: product.category.slug }}
              className="font-medium text-foreground transition-colors hover:text-sky-500"
            >
              {product.category.title}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        {/* ستون محتوا: تصویر شناور در سمت راست، متن‌ها دور آن جریان دارند */}
        <div className="min-w-0">
          {/* تصاویر */}
          <div className="mb-5 lg:float-right lg:mb-4 lg:ml-6 lg:w-[420px]">
            <div className="overflow-hidden rounded-xl border border-border bg-secondary">
              <img
                src={activeImage}
                alt={product.name}
                className="aspect-square w-full object-cover"
              />
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {gallery.map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setActiveImage(src)}
                    aria-label="نمایش تصویر"
                    className={`overflow-hidden rounded-lg border-2 transition ${
                      activeImage === src ? "border-primary" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img src={src} alt={product.name} className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-foreground md:text-3xl">{product.name}</h1>

          {product.category && (
            <div className="mt-3 text-sm">
              <span className="text-muted-foreground">
                دسته‌بندی:{" "}
                <Link
                  to="/products"
                  search={{ category: product.category.slug }}
                  className="font-medium text-sky-500 hover:underline"
                >
                  {product.category.name}
                </Link>
              </span>
            </div>
          )}

          {product.brand && (
            <div className="mt-1.5 text-sm">
              <span className="text-muted-foreground">
                برند: <span className="font-medium text-foreground">{product.brand}</span>
              </span>
            </div>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            <StarRating rating={rating} size="md" count={reviewsCount} />

            <span className="text-muted-foreground/40">|</span>

            <button
              type="button"
              onClick={scrollToComments}
              className="font-medium text-sky-500 hover:underline"
            >
              {formatPrice(reviewsCount)} نظر
            </button>
          </div>


          {availableVariants.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-bold text-foreground">انتخاب تنوع محصول</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableVariants.map((variant) => {
                  const label = variant.attribute_values.map((item) => `${item.title}: ${item.value}`).join("، ") || variant.sku;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={variant.stock <= 0}
                      onClick={() => { setSelectedVariantId(variant.id); setQuantity((q) => Math.min(q, Math.max(1, variant.stock))); }}
                      className={`rounded-md border px-3 py-1.5 text-sm transition ${selectedVariant?.id === variant.id ? "border-primary font-medium text-primary" : "border-border text-muted-foreground hover:border-primary/50"} disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {label}{variant.stock <= 0 ? " (ناموجود)" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}


          <div className="mt-8">
            <h2 className="text-sm font-bold text-foreground">توضیحات محصول</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{product.description}</p>
          </div>

            {!!product.specs?.length && (
            <div className="mt-8 lg:clear-right">
              <h2 className="text-sm font-bold text-foreground">ویژگی‌ها</h2>
              <table className="mt-2 w-full overflow-hidden border border-border text-sm">
                <tbody>
                  {product.specs.map((spec, i) => (
                    <tr key={spec.label} className={i % 2 ? "bg-secondary/40" : ""}>
                      <th className="w-40 border-b border-border px-4 py-2.5 text-right font-medium text-muted-foreground">
                        {spec.label}
                      </th>
                      <td className="border-b border-border px-4 py-2.5 text-foreground">
                        {spec.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* محصولات پیشنهادی */}
          {suggestions.length > 0 && (
            <section className="mt-10 border-t border-border pt-8">
              <h2 className="text-xl font-bold text-foreground">محصولات پیشنهادی</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {suggestions.map((item) => (
                  <ProductCard key={item.id} product={item} compact />
                ))}
              </div>
            </section>
          )}

          {/* نظرات */}
          <div id="comments" className="scroll-mt-28">
            <ProductComments productId={product.id} />
          </div>
        </div>

        {/* سایدبار خرید */}
        <aside className="lg:h-full">
          <div className="rounded-xl border border-border bg-secondary/40 p-4 lg:sticky lg:top-28">


            <button
              type="button"
              onClick={() => {
                if (isLoading) return;
                if (!isAuthenticated) {
                  router.navigate({ to: "/login", search: { redirect: "/products/" + product.slug }, replace: true });
                  return;
                }
                toggleFavorite(product);
              }}
              disabled={isLoading}
              aria-pressed={isFavorite(product.id)}
              className="mb-4 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition hover:border-primary hover:text-primary"
            >
              <Heart className={"h-4 w-4 " + (isFavorite(product.id) ? "fill-rose-500 text-rose-500" : "")} />
              {isFavorite(product.id) ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
            </button>

            <div className="flex items-center gap-2 text-sm">
              <Store className="h-4 w-4 text-sky-500" />
              <span className="font-medium text-foreground">فروش و ارسال توسط فروشگاه</span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {formatPrice(displayPrice)}
              </span>
              <span className="text-sm text-muted-foreground">تومان</span>
              {discountPercent > 0 && (
                <span className="rounded-md bg-green-600 px-2 py-0.5 text-xs font-bold text-white">
                  {formatPrice(discountPercent)}٪
                </span>
              )}
            </div>
            {comparePrice && comparePrice > displayPrice && (
              <div className="mt-1 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground line-through">
                  {formatPrice(comparePrice)}
                </span>
                <span className="font-medium text-green-600">
                  {formatPrice(comparePrice - displayPrice)} تومان سود شما
                </span>
              </div>
            )}

            <p className="mt-2 flex items-center gap-2 text-sm font-medium">
              {Boolean(selectedVariant && selectedVariant.stock > 0 && product.is_available) ? (
                <>
                  <Package className={`h-4 w-4 ${selectedVariant!.stock < 4 ? "text-destructive" : "text-green-600"}`} />
                  <span className={selectedVariant!.stock < 4 ? "text-destructive" : "text-foreground"}>
                    {selectedVariant!.stock < 4
                      ? `فقط ${formatPrice(selectedVariant!.stock)} عدد در انبار`
                      : "موجود در انبار"}
                  </span>
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">ناموجود</span>
                </>
              )}
            </p>


            <div className="mt-3">
              <span className="text-sm text-muted-foreground">تعداد</span>
              <div className="mt-1.5 flex items-center rounded-md border border-input bg-background">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  disabled={quantity <= 1}
                  aria-label="کاهش تعداد"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="flex-1 text-center text-base font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="افزایش تعداد"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-md bg-secondary px-3 py-2 text-sm">
              <span className="text-muted-foreground">مبلغ قابل پرداخت</span>
              <span className="font-bold text-foreground">
                {formatPrice(displayPrice * quantity)} تومان
              </span>
            </div>

            <Button
              size="lg"
              className="mt-3 w-full rounded-md text-base"
              onClick={() => {
                if (isLoading) return;
                if (!isAuthenticated) {
                  router.navigate({ to: "/login", search: { redirect: `/products/${product.slug}` }, replace: true });
                  return;
                }
                if (!selectedVariant) return;
                addItem(product, selectedVariant, quantity);
              }}
              disabled={isLoading || !selectedVariant || selectedVariant.stock <= 0}
            >
              <ShoppingCart className="ml-2 h-5 w-5" />
              افزودن به سبد خرید
            </Button>

            <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Truck className="h-4 w-4 text-sky-500" />
                ارسال سریع به سراسر کشور
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-sky-500" />
                ضمانت اصالت و سلامت کالا
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <RotateCcw className="h-4 w-4 text-sky-500" />
                ۷ روز ضمانت بازگشت کالا
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-4 w-4 text-sky-500" />
                پرداخت امن و درگاه معتبر
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Headphones className="h-4 w-4 text-sky-500" />
                پشتیبانی ۷ روز هفته
              </div>
            </div>

            <div className="mt-3 rounded-md border border-dashed border-border p-3 text-xs leading-6 text-muted-foreground">
              سفارش‌های ثبت‌شده تا ساعت ۱۸ همان روز پردازش و ارسال می‌شوند.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
