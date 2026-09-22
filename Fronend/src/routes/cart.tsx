import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const { items, updateQuantity, removeItem, total } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const formatPrice = (price: number) => new Intl.NumberFormat("fa-IR").format(price);

  if (items.length === 0) {
    return (
      <div className="container-shop flex flex-col items-center justify-center py-20 text-center" dir="rtl">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-foreground">سبد خرید شما خالی است</h1>
        <p className="mt-2 text-muted-foreground">محصولات مورد علاقه‌تان را اضافه کنید و اینجا ببینید.</p>
        <Button className="mt-6" asChild>
          <Link to="/products">مشاهده محصولات</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-shop py-8" dir="rtl">
      <h1 className="text-3xl font-bold text-foreground">سبد خرید</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.product.id}
              className="flex gap-4 rounded-xl border border-border bg-card p-4"
            >
              <img
                src={item.product.image || "/placeholder.svg"}
                alt={item.product.name}
                className="h-24 w-24 rounded-lg object-cover"
              />
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link
                    to="/products/$productId"
                    params={{ productId: item.product.slug }}
                    className="font-semibold text-foreground hover:text-primary"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(item.product.price)} تومان
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center rounded-md border border-input bg-background">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label="کاهش"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label="افزایش"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="flex items-center gap-1 text-sm text-destructive transition-colors hover:text-destructive/80"
                  >
                    <Trash2 className="h-4 w-4" />
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" asChild className="mt-4">
            <Link to="/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              ادامه خرید
            </Link>
          </Button>
        </div>

        <div className="h-fit rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">خلاصه سفارش</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>تعداد اقلام</span>
              <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>مجموع</span>
              <span>{formatPrice(total)} تومان</span>
            </div>
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex justify-between text-lg font-bold text-foreground">
              <span>مبلغ قابل پرداخت</span>
              <span>{formatPrice(total)} تومان</span>
            </div>
          </div>
          <Button
            className="mt-6 w-full"
            size="lg"
            onClick={() => {
              if (isAuthenticated) {
                router.navigate({ to: "/checkout" });
              } else {
                router.navigate({ to: "/login", search: { redirect: "/checkout" } });
              }
            }}
          >
            {isAuthenticated ? "ادامه به پرداخت" : "ورود و ادامه خرید"}
          </Button>
        </div>
      </div>
    </div>
  );
}
