import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { ArrowLeft, Truck, ShieldCheck, Headphones } from "lucide-react";
import { getProducts, getCategories, getArticles } from "@/lib/shop/api";
import { ProductCard } from "@/components/shop/ProductCard";
import { ArticleMiniCard } from "@/components/shop/ArticleMiniCard";
import { SectionCarousel } from "@/components/shop/SectionCarousel";
import { HeroSlider } from "@/components/shop/HeroSlider";


const featuredProductsQueryOptions = queryOptions({
  queryKey: ["products", "featured"],
  queryFn: () => getProducts({ data: {} }),
});

const categoriesQueryOptions = queryOptions({
  queryKey: ["categories"],
  queryFn: () => getCategories(),
});

const articlesQueryOptions = queryOptions({
  queryKey: ["articles", "latest"],
  queryFn: () => getArticles({ data: {} }),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(featuredProductsQueryOptions);
    context.queryClient.ensureQueryData(categoriesQueryOptions);
    context.queryClient.ensureQueryData(articlesQueryOptions);
  },
  component: HomePage,
});

function HomePage() {
  const { data: products } = useSuspenseQuery(featuredProductsQueryOptions);
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions);
  const { data: articles } = useSuspenseQuery(articlesQueryOptions);

  const all = products || [];
  const featured = all.slice(0, 8);
  const bestSellers = [...all].sort((a, b) => a.stock - b.stock).slice(0, 8);
  const discounted = all.filter((p) => p.compare_price && p.compare_price > p.price).slice(0, 8);
  const latestArticles = [...(articles || [])]
    .sort((a, b) => +new Date(b.pub_date) - +new Date(a.pub_date))
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-12 pb-16" dir="rtl">
      {/* Hero - full width, half height */}
      <section className="w-full pt-4 md:pt-6">
        <HeroSlider />
      </section>

      {/* Categories */}
      <section className="w-full bg-primary/5 py-10">
        <div className="container-shop">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">دسته‌بندی‌ها</h2>
            <Link to="/products" className="flex items-center text-sm font-medium text-primary hover:underline">
              همه محصولات
              <ArrowLeft className="mr-1 h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories?.map((category) => (
              <Link
                key={category.id}
                to="/products"
                search={{ category: category.slug }}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {category.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Rows */}
      <SectionCarousel
        title="محصولات ویژه"
        items={featured}
        viewAll={{ to: "/products" }}
        renderItem={(p) => <ProductCard product={p} compact />}
      />

      <SectionCarousel
        title="محصولات پرفروش"
        items={bestSellers}
        viewAll={{ to: "/products" }}
        renderItem={(p) => <ProductCard product={p} compact />}
      />

      <SectionCarousel
        title="محصولات با تخفیف"
        items={discounted}
        viewAll={{ to: "/products" }}
        renderItem={(p) => <ProductCard product={p} compact />}
      />

      <SectionCarousel
        title="آخرین مقالات"
        items={latestArticles}
        viewAll={{ to: "/articles" }}
        renderItem={(a) => <ArticleMiniCard article={a} />}
      />


      {/* Features */}
      <section className="container-shop">
        <div className="grid gap-6 rounded-2xl border border-border bg-secondary/30 p-8 md:grid-cols-3">
          <div className="flex flex-col items-center text-center md:items-start md:text-start">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Truck className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">ارسال سریع</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              ارسال به سراسر کشور در کوتاه‌ترین زمان ممکن.
            </p>
          </div>
          <div className="flex flex-col items-center text-center md:items-start md:text-start">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">ضمانت اصالت</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              تمامی محصولات با ضمانت اصالت و کیفیت ارائه می‌شوند.
            </p>
          </div>
          <div className="flex flex-col items-center text-center md:items-start md:text-start">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Headphones className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">پشتیبانی ۲۴ ساعته</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              تیم پشتیبانی در هر ساعت از شبانه‌روز آماده کمک است.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
