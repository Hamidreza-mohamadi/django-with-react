import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { createOrder, getOrderQuote, simulateOrderPayment } from "@/lib/shop/api";
import type { OrderQuote } from "@/lib/shop/types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

function CheckoutPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { items, total, clearCart } = useCart();
  const router = useRouter();
  const submitOrder = useServerFn(createOrder);
  const fetchQuote = useServerFn(getOrderQuote);
  const payTestOrder = useServerFn(simulateOrderPayment);
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [canSimulatePayment, setCanSimulatePayment] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const formatPrice = (value: number) => new Intl.NumberFormat("fa-IR").format(value);

  useEffect(() => {
    if (!isAuthenticated || items.length === 0) {
      setQuote(null);
      setQuoteLoading(false);
      return;
    }
    let active = true;
    setQuoteLoading(true);
    fetchQuote({ data: { items: items.map((item) => ({ variant_id: item.variant.id, quantity: item.quantity })) } })
      .then((result) => { if (active) { setQuote(result); setError(""); } })
      .catch((err) => {
        if (active) {
          setQuote(null);
          setError(err instanceof Error ? err.message : "محاسبه مبلغ سفارش ناموفق بود.");
        }
      })
      .finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [fetchQuote, isAuthenticated, items]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    try {
      const order = await submitOrder({
        data: {
          items: items.map((item) => ({ variant_id: item.variant.id, quantity: item.quantity })),
          shipping_address: {
            province: String(form.get("province") || ""),
            city: String(form.get("city") || ""),
            postal_code: String(form.get("postal_code") || ""),
            exact_address: String(form.get("exact_address") || ""),
            phone: String(form.get("phone") || ""),
          },
        },
      });
      setOrderId(order.id);
      setCanSimulatePayment(Boolean(order.can_simulate_payment));
      clearCart();
      formElement.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت سفارش ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  async function simulatePayment() {
    if (orderId === null || paymentLoading) return;
    setPaymentLoading(true);
    setPaymentMessage("");
    setError("");
    try {
      const paidOrder = await payTestOrder({ data: { orderId } });
      setCanSimulatePayment(Boolean(paidOrder.can_simulate_payment));
      setPaymentMessage(paidOrder.is_paid ? "پرداخت آزمایشی موفق بود؛ فروش این محصول در مرتب‌سازی پرفروش‌ترین‌ها محاسبه می‌شود." : "وضعیت سفارش به‌روزرسانی شد.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "پرداخت آزمایشی ناموفق بود.");
    } finally {
      setPaymentLoading(false);
    }
  }

  if (isLoading) return <div className="container-shop py-12">در حال بررسی حساب کاربری...</div>;
  if (!isAuthenticated) {
    void router.navigate({ to: "/login", search: { redirect: "/checkout" } });
    return null;
  }

  if (orderId !== null) {
    return <div dir="rtl" className="container-shop mx-auto max-w-xl py-16 text-center">
      <div className="rounded-2xl border border-border bg-card p-8">
        <h1 className="text-2xl font-bold">سفارش ثبت شد</h1>
        <p className="mt-3 text-muted-foreground">شماره سفارش: {orderId}</p>
        <p className="mt-2 text-sm text-muted-foreground">{canSimulatePayment ? "درگاه واقعی متصل نیست؛ برای آزمایش شمارش فروش می‌توانید پرداخت توسعه را شبیه‌سازی کنید." : "سفارش ثبت شده است. درگاه پرداخت واقعی هنوز متصل نیست."}</p>
        {paymentMessage && <p role="status" className="mt-3 rounded-md bg-green-500/10 p-3 text-sm text-green-700">{paymentMessage}</p>}
        {error && <p role="alert" className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {canSimulatePayment && <Button className="mt-5" onClick={simulatePayment} disabled={paymentLoading}>{paymentLoading ? "در حال شبیه‌سازی پرداخت..." : "پرداخت آزمایشی (محیط توسعه)"}</Button>}
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild><Link to="/orders">مشاهده سفارش‌ها</Link></Button>
          <Button variant="outline" asChild><Link to="/products">ادامه خرید</Link></Button>
        </div>
      </div>
    </div>;
  }

  if (items.length === 0) return <div dir="rtl" className="container-shop py-16 text-center">
    <h1 className="text-2xl font-bold">سبد خرید خالی است</h1>
    <Button className="mt-5" asChild><Link to="/products">مشاهده محصولات</Link></Button>
  </div>;

  const staleProductError = error.includes("محصول") && (error.includes("وجود ندارد") || error.includes("غیرفعال"));

  return <div dir="rtl" className="container-shop mx-auto max-w-3xl py-10">
    <h1 className="text-3xl font-bold">تکمیل سفارش</h1>
    <div className="mt-6 grid gap-8 md:grid-cols-[1fr_280px]">
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">اطلاعات ارسال</h2>
        <label className="block space-y-2 text-sm font-medium">استان
          <input name="province" className="w-full rounded-md border border-input bg-background px-3 py-2 font-normal" />
        </label>
        <label className="block space-y-2 text-sm font-medium">شهر
          <input name="city" required className="w-full rounded-md border border-input bg-background px-3 py-2 font-normal" />
        </label>
        <label className="block space-y-2 text-sm font-medium">کد پستی
          <input name="postal_code" required inputMode="numeric" className="w-full rounded-md border border-input bg-background px-3 py-2 font-normal" />
        </label>
        <label className="block space-y-2 text-sm font-medium">آدرس دقیق
          <textarea name="exact_address" required rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 font-normal" />
        </label>
        <label className="block space-y-2 text-sm font-medium">شماره تماس
          <input name="phone" required type="tel" className="w-full rounded-md border border-input bg-background px-3 py-2 font-normal" />
        </label>
        {error && <div role="alert" className="space-y-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <p>{error}</p>
          {staleProductError && <div>
            <p>احتمالاً سبد خرید از اطلاعات قدیمی مرورگر ساخته شده است. سبد را خالی کنید و محصولات را دوباره از فروشگاه اضافه کنید.</p>
            <Button type="button" variant="outline" onClick={() => { clearCart(); setError(""); setQuote(null); }}>خالی کردن سبد خرید</Button>
          </div>}
        </div>}
        <Button type="submit" className="w-full" disabled={loading || quoteLoading || !quote}>{loading ? "در حال ثبت سفارش..." : quoteLoading ? "در حال بررسی قیمت..." : "ثبت سفارش"}</Button>
      </form>
      <aside className="h-fit rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">خلاصه سفارش</h2>
        {quoteLoading && <p className="mt-3 text-sm text-muted-foreground">در حال محاسبه قیمت روز محصولات...</p>}
        <div className="mt-4 space-y-3 text-sm">
          {items.map((item) => {
            const quoted = quote?.items.find((line) => line.variant_id === item.variant.id);
            return <div key={item.variant.id} className="flex justify-between gap-3">
              <div className="min-w-0">
                <span className="block">{quoted?.name ?? item.product.name} × {item.quantity}</span>
                {quoted && quoted.line_discount > 0 && (
                  <span className="mt-1 block text-xs text-green-700">
                    تخفیف: {formatPrice(quoted.line_discount)} تومان
                  </span>
                )}
              </div>
              <div className="whitespace-nowrap text-left">
                {quoted && quoted.regular_unit_price > quoted.unit_price && (
                  <span className="block text-xs text-muted-foreground line-through">
                    {formatPrice(quoted.regular_unit_price * item.quantity)}
                  </span>
                )}
                <span>{formatPrice(quoted?.line_total ?? item.variant.price * item.quantity)} تومان</span>
              </div>
            </div>;
          })}
        </div>
        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          {quote && quote.discount_total > 0 && (
            <>
              <div className="flex justify-between">
                <span>جمع قبل از تخفیف</span>
                <span className="line-through text-muted-foreground">{formatPrice(quote.original_subtotal)} تومان</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>مجموع تخفیف</span>
                <span>− {formatPrice(quote.discount_total)} تومان</span>
              </div>
            </>
          )}
          <div className="flex justify-between"><span>جمع محصولات پس از تخفیف</span><span>{formatPrice(quote?.subtotal ?? total)} تومان</span></div>
          <div className="flex justify-between"><span>هزینه ارسال</span><span>{formatPrice(quote?.shipping_cost ?? 0)} تومان</span></div>
        </div>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-bold">
          <span>مبلغ نهایی</span><span>{formatPrice(quote?.total ?? total)} تومان</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">مبلغ و موجودی در سمت سرور بررسی می‌شوند. موجودی سفارش پرداخت‌نشده برای ۱۵ دقیقه رزرو می‌شود.</p>
      </aside>
    </div>
  </div>;
}
