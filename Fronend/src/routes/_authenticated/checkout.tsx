import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { CreditCard, MapPin, CheckCircle } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { createOrder } from "@/lib/shop/api";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const router = useRouter();
  const createOrderFn = useServerFn(createOrder);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const formatPrice = (price: number) => new Intl.NumberFormat("fa-IR").format(price);

  if (items.length === 0 && !done) {
    router.navigate({ to: "/cart" });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const shippingAddress = String(formData.get("address"));

    try {
      await createOrderFn({
        data: {
          items: items.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
          shipping_address: shippingAddress,
        },
      });
      clearCart();
      setDone(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "ثبت سفارش ناموفق بود");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="container-shop flex min-h-[50vh] flex-col items-center justify-center py-12 text-center" dir="rtl">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-foreground">سفارش شما ثبت شد</h1>
        <p className="mt-2 text-muted-foreground">با تشکر از خرید شما. وضعیت سفارش را در صفحه سفارش‌ها پیگیری کنید.</p>
        <Button className="mt-6" asChild>
          <a href="/orders">مشاهده سفارش‌ها</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-shop py-8" dir="rtl">
      <h1 className="text-3xl font-bold text-foreground">تکمیل خرید</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">آدرس ارسال</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="address" className="text-sm font-medium">
                  آدرس کامل
                </label>
                <textarea
                  id="address"
                  name="address"
                  required
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm outline-none ring-ring focus-visible:ring-1"
                  placeholder="استان، شهر، خیابان، پلاک، واحد"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="postal" className="text-sm font-medium">
                  کد پستی
                </label>
                <input
                  id="postal"
                  name="postal"
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm outline-none ring-ring focus-visible:ring-1"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  شماره تماس
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm outline-none ring-ring focus-visible:ring-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 border-b border-border pb-4 pt-4">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">روش پرداخت</h2>
            </div>

            <div className="rounded-lg border border-input bg-secondary/30 p-4">
              <p className="text-sm text-muted-foreground">
                در این نسخه پرداخت آنلاین به درگاه متصل نیست. سفارش شما ثبت و از طریق پشتیبانی پیگیری می‌شود.
              </p>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "در حال ثبت..." : `پرداخت ${formatPrice(total)} تومان`}
            </Button>
          </form>
        </div>

        <div className="h-fit rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">خلاصه سفارش</h2>
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.product.name} × {item.quantity}
                </span>
                <span className="font-medium">
                  {formatPrice(item.product.price * item.quantity)} تومان
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex justify-between text-lg font-bold text-foreground">
              <span>مجموع</span>
              <span>{formatPrice(total)} تومان</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
