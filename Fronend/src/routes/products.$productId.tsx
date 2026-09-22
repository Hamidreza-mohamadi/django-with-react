import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Minus, Plus, ShoppingCart, Truck, ShieldCheck, RotateCcw, Store, Package, CreditCard, Headphones } from "lucide-react";
import { useState } from "react";
import { getProduct, getProductComments, getProducts } from "@/lib/shop/api";
import { useCart } from "@/hooks/use-cart";
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
    context.queryClient.ensureQueryData(productCommentsQueryOptions(product.id));
    context.queryClient.ensureQueryData(relatedQueryOptions());
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
  const { data: related } = useSuspenseQuery(relatedQueryOptions());
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const gallery = product.images?.length ? product.images : [product.image || "/placeholder.svg"];
  const [activeImage, setActiveImage] = useState(gallery[0]);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0]);

  if (!product) throw notFound();

  const rating = product.rating ?? 0;
  const reviewsCount = comments.length || product.reviews_count || 0;
  const discountPercent =
    product.compare_price && product.compare_price > product.price
      ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
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
  console.log("alliiiiiiiiiiii" , product.stock);
  console.log("related: ",related);

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


          {!!product.colors?.length && (
            <div className="mt-8">
              <h2 className="text-sm font-bold text-foreground">رنگ‌های موجود</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`rounded-md border px-3 py-1.5 text-sm transition ${
                      selectedColor === color
                        ? "border-primary font-medium text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {color}
                  </button>
                ))}
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


            <div className="flex items-center gap-2 text-sm">
              <Store className="h-4 w-4 text-sky-500" />
              <span className="font-medium text-foreground">فروش و ارسال توسط فروشگاه</span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {formatPrice(product.price)}
              </span>
              <span className="text-sm text-muted-foreground">تومان</span>
              {discountPercent > 0 && (
                <span className="rounded-md bg-green-600 px-2 py-0.5 text-xs font-bold text-white">
                  {formatPrice(discountPercent)}٪
                </span>
              )}
            </div>
            {product.compare_price && product.compare_price > product.price && (
              <div className="mt-1 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground line-through">
                  {formatPrice(product.compare_price)}
                </span>
                <span className="font-medium text-green-600">
                  {formatPrice(product.compare_price - product.price)} تومان سود شما
                </span>
              </div>
            )}

            <p className="mt-2 flex items-center gap-2 text-sm font-medium">
              {product.stock > 0 && product.is_available ? (
                <>
                  <Package className={`h-4 w-4 ${product.stock < 4 ? "text-destructive" : "text-green-600"}`} />
                  <span className={product.stock < 4 ? "text-destructive" : "text-foreground"}>
                    {product.stock < 4
                      ? `فقط ${formatPrice(product.stock)} عدد در انبار`
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
                {formatPrice(product.price * quantity)} تومان
              </span>
            </div>

            <Button
              size="lg"
              className="mt-3 w-full rounded-md text-base"
              onClick={() => addItem(product, quantity)}
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
