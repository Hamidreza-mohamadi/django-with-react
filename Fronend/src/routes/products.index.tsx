import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X, ChevronDown, ArrowDownUp } from "lucide-react";
import { useEffect, useState } from "react";
import { getProducts, getCategories, getProductFilterOptions } from "@/lib/shop/api";
import type { ProductOrdering } from "@/lib/shop/types";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ProductSearch {
  category?: string;
  search?: string;
  page?: number;
  brand?: string[];
  color?: string[];
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  ordering?: ProductOrdering;
}

const SORT_OPTIONS: { value: ProductOrdering; label: string }[] = [
  { value: "-created_at", label: "جدیدترین" },
  { value: "-sales_count", label: "پرفروش‌ترین" },
  { value: "-views", label: "پربازدیدترین" },
  { value: "-price", label: "گران‌ترین" },
  { value: "price", label: "ارزان‌ترین" },
];

const productsQueryOptions = (filters: ProductSearch) =>
  queryOptions({
    queryKey: ["products", "list", filters],
    queryFn: () => getProducts({ data: filters }),
  });

const categoriesQueryOptions = queryOptions({
  queryKey: ["categories"],
  queryFn: () => getCategories(),
});

const filterOptionsQueryOptions = (category?: string) =>
  queryOptions({
    queryKey: ["products", "filter-options", category ?? null],
    queryFn: () => getProductFilterOptions({ data: { category } }),
  });

const asStringArray = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const list = value.filter((v): v is string => typeof v === "string");
    return list.length ? list : undefined;
  }
  if (typeof value === "string" && value) return [value];
  return undefined;
};

const asNumber = (value: unknown): number | undefined => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
};

export const Route = createFileRoute("/products/")({
  validateSearch: (search: Record<string, unknown>): ProductSearch => ({
    category: typeof search.category === "string" ? search.category : undefined,
    search: typeof search.search === "string" ? search.search : undefined,
    page: typeof search.page === "number" ? search.page : 1,
    brand: asStringArray(search.brand),
    color: asStringArray(search.color),
    min_price: asNumber(search.min_price),
    max_price: asNumber(search.max_price),
    in_stock: search.in_stock === true || search.in_stock === "true" ? true : undefined,
    ordering: SORT_OPTIONS.some((o) => o.value === search.ordering)
      ? (search.ordering as ProductOrdering)
      : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    context.queryClient.ensureQueryData(productsQueryOptions(deps));
    context.queryClient.ensureQueryData(categoriesQueryOptions);
    context.queryClient.ensureQueryData(filterOptionsQueryOptions(deps.category));
  },
  component: ProductsPage,
});

function FilterSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="border-b border-border/60 py-5 last:border-b-0">
      <CollapsibleTrigger className="group flex w-full items-center justify-between text-base font-bold">
        {title}
        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

const PRICE_MAX = 100_000_000;
const faNum = (n: number) => new Intl.NumberFormat("fa-IR").format(n);


function ProductsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: products } = useSuspenseQuery(productsQueryOptions(search));
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions);
  const { data: filterOptions } = useSuspenseQuery(filterOptionsQueryOptions(search.category));

  const activeCategory = categories?.find((c) => c.slug === search.category);

  const brands = filterOptions?.brands ?? [];
  const colorOptions = filterOptions?.colors ?? [];
  const maxPrice = filterOptions?.max_price ?? 0;

  const selectedBrands = search.brand ?? [];
  const selectedColors = search.color ?? [];
  const inStockOnly = search.in_stock === true;
  const ordering = search.ordering ?? "-created_at";

  const appliedMin = search.min_price ?? 0;
  const appliedMax = search.max_price ?? PRICE_MAX;
  const [priceDraft, setPriceDraft] = useState<[number, number]>([appliedMin, appliedMax]);
  useEffect(() => {
    setPriceDraft([appliedMin, appliedMax]);
  }, [appliedMin, appliedMax]);

  const setSearch = (patch: Partial<ProductSearch>) =>
    navigate({ search: (prev: ProductSearch) => ({ ...prev, ...patch, page: 1 }) });

  const toggleValue = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const filtered = products ?? [];

  const resetFilters = () => {
    setPriceDraft([0, PRICE_MAX]);
    navigate({
      search: (prev: ProductSearch) => ({
        category: prev.category,
        search: prev.search,
        ordering: prev.ordering,
        page: 1,
      }),
    });
  };




  return (
    <div className="container-shop py-8" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">محصولات</h1>
        <p className="mt-2 text-muted-foreground">
          {activeCategory ? activeCategory.description : "همه محصولات را مرور کنید و مورد علاقه‌تان را پیدا کنید."}
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={!search.category ? "default" : "outline"}
            size="sm"
            onClick={() => navigate({ search: (prev: ProductSearch) => ({ ...prev, category: undefined, page: 1 }) })}
          >
            همه
          </Button>
          {categories?.map((category) => (
            <Button
              key={category.id}
              variant={search.category === category.slug ? "default" : "outline"}
              size="sm"
              onClick={() =>
                navigate({ search: (prev: ProductSearch) => ({ ...prev, category: category.slug, page: 1 }) })
              }
            >
              {category.title}
            </Button>
          ))}
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const q = String(formData.get("q") || "");
            navigate({ search: (prev: ProductSearch) => ({ ...prev, search: q || undefined, page: 1 }) });
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              type="text"
              defaultValue={search.search || ""}
              placeholder="جستجوی محصول..."
              className="h-9 w-full rounded-md border border-input bg-background pr-9 pl-4 text-sm outline-none ring-ring focus-visible:ring-1"
            />
            {search.search && (
              <button
                type="button"
                onClick={() => navigate({ search: (prev: ProductSearch) => ({ ...prev, search: undefined, page: 1 }) })}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button type="submit" size="sm">
            جستجو
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Filter sidebar (right in RTL) */}
        <aside className="w-full shrink-0 lg:w-72">
          <div className="rounded-2xl border-2 border-border bg-secondary/40 p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <SlidersHorizontal className="h-5 w-5" />
                فیلترها
              </h2>
              <button
                type="button"
                onClick={resetFilters}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                پاک کردن
              </button>
            </div>

            <FilterSection title="برند">
              <div className="max-h-56 space-y-3 overflow-y-auto pl-1">
                {brands.length === 0 && (
                  <p className="text-sm text-muted-foreground">برندی موجود نیست</p>
                )}
                {brands.map((brand) => (
                  <label key={brand} className="flex items-center gap-3 text-[15px]">
                    <Checkbox
                      checked={selectedBrands.includes(brand)}
                      onCheckedChange={() => {
                        const next = toggleValue(selectedBrands, brand);
                        setSearch({ brand: next.length ? next : undefined });
                      }}
                    />
                    {brand}
                  </label>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="محدوده قیمت">
              <div className="px-1">
                <div className="flex items-end gap-2">
                  <label className="flex-1 text-xs text-muted-foreground">
                    از (تومان)
                    <input
                      type="number"
                      min={0}
                      max={PRICE_MAX}
                      step={500_000}
                      value={priceDraft[0]}
                      onChange={(e) => {
                        const v = Math.min(Math.max(Number(e.target.value) || 0, 0), priceDraft[1]);
                        setPriceDraft([v, priceDraft[1]]);
                      }}
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none ring-ring focus-visible:ring-1"
                    />
                  </label>
                  <span className="pb-2 text-muted-foreground">—</span>
                  <label className="flex-1 text-xs text-muted-foreground">
                    تا (تومان)
                    <input
                      type="number"
                      min={0}
                      max={PRICE_MAX}
                      step={500_000}
                      value={priceDraft[1]}
                      onChange={(e) => {
                        const v = Math.max(
                          Math.min(Number(e.target.value) || 0, PRICE_MAX),
                          priceDraft[0],
                        );
                        setPriceDraft([priceDraft[0], v]);
                      }}
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none ring-ring focus-visible:ring-1"
                    />
                  </label>
                </div>
                <Slider
                  min={0}
                  max={PRICE_MAX}
                  step={500_000}
                  value={priceDraft}
                  onValueChange={(v: number[]) => setPriceDraft([v[0], v[1]] as [number, number])}
                  className="my-5"
                />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>از {faNum(priceDraft[0])} تومان</span>
                  <span>تا {faNum(priceDraft[1])} تومان</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() =>
                    setSearch({
                      min_price: priceDraft[0] > 0 ? priceDraft[0] : undefined,
                      max_price: priceDraft[1] < PRICE_MAX ? priceDraft[1] : undefined,
                    })
                  }
                >
                  اعمال
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">
                  بیشترین قیمت موجود: {faNum(maxPrice)} تومان
                </p>
              </div>
            </FilterSection>

            <FilterSection title="رنگ">
              <div className="max-h-56 space-y-3 overflow-y-auto pl-1">
                {colorOptions.length === 0 && (
                  <p className="text-sm text-muted-foreground">رنگی ثبت نشده است</p>
                )}
                {colorOptions.map((color) => (
                  <label key={color} className="flex items-center gap-3 text-[15px]">
                    <Checkbox
                      checked={selectedColors.includes(color)}
                      onCheckedChange={() => {
                        const next = toggleValue(selectedColors, color);
                        setSearch({ color: next.length ? next : undefined });
                      }}
                    />
                    {color}
                  </label>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="موجودی">
              <label className="flex items-center gap-3 text-[15px]">
                <Checkbox
                  checked={inStockOnly}
                  onCheckedChange={(v) => setSearch({ in_stock: v ? true : undefined })}
                />
                فقط کالاهای موجود
              </label>
            </FilterSection>
          </div>
        </aside>


        <div className="flex-1">
          <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <ArrowDownUp className="h-3.5 w-3.5" />
              مرتب‌سازی بر اساس:
            </span>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSearch({ ordering: option.value })}
                className={`text-sm transition-colors hover:text-primary ${
                  ordering === option.value
                    ? "font-bold text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {filtered.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 py-20 text-center">
              <SlidersHorizontal className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">محصولی پیدا نشد</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                فیلترها را تغییر دهید یا عبارت جستجوی دیگری امتحان کنید.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={resetFilters}
              >
                پاک کردن فیلترها
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
