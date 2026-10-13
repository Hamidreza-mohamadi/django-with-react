import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getOrders } from "@/lib/shop/api";
import type { Order } from "@/lib/shop/types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/orders")({ component: OrdersPage });

function OrdersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const loadOrders = useServerFn(getOrders);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let active = true;
    loadOrders()
      .then((data) => { if (active) setOrders(data); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "دریافت سفارش‌ها ناموفق بود."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authLoading, isAuthenticated, loadOrders]);

  if (authLoading) return <div className="container-shop py-12">در حال بارگذاری...</div>;
  if (!isAuthenticated) {
    void router.navigate({ to: "/login", search: { redirect: "/orders" } });
    return null;
  }

  const formatPrice = (value: number) => new Intl.NumberFormat("fa-IR").format(value);
  const statusLabels: Record<NonNullable<Order["status"]>, string> = {
    pending: "در انتظار پرداخت",
    confirmed: "تأیید شده",
    processing: "در حال آماده‌سازی",
    shipped: "ارسال شده",
    delivered: "تحویل شده",
    cancelled: "لغو شده",
  };

  return <div dir="rtl" className="container-shop py-10">
    <h1 className="text-3xl font-bold">سفارش‌های من</h1>
    {loading && <p className="mt-6 text-muted-foreground">در حال دریافت سفارش‌ها...</p>}
    {error && <p role="alert" className="mt-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {!loading && !error && orders.length === 0 && <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
      <p>هنوز سفارشی ثبت نکرده‌اید.</p>
      <Button className="mt-4" asChild><Link to="/products">مشاهده محصولات</Link></Button>
    </div>}
    <div className="mt-6 space-y-4">
      {orders.map((order) => <article key={order.id} className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">سفارش شماره {order.id}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{order.created_at ? new Date(order.created_at).toLocaleDateString("fa-IR") + " · " : ""}{order.address ? order.address.city + "، " + order.address.exact_address : "آدرس ثبت نشده"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-secondary px-3 py-1 text-sm">{statusLabels[order.status ?? "pending"]}</span>
            <span className={order.is_paid ? "rounded-full bg-primary/10 px-3 py-1 text-sm" : "rounded-full bg-secondary px-3 py-1 text-sm"}>
              {order.is_paid ? "پرداخت شده" : "پرداخت نشده"}
            </span>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {order.items.map((item) => <div key={item.id} className="flex justify-between gap-3 text-sm">
            <span>{item.product.name} × {item.quantity}</span>
            <span className="whitespace-nowrap">{formatPrice(item.price ?? item.product.price * item.quantity)} تومان</span>
          </div>)}
        </div>
        <div className="mt-4 flex justify-between border-t border-border pt-4 font-bold">
          <span>مبلغ سفارش</span><span>{formatPrice(order.total)} تومان</span>
        </div>
      </article>)}
    </div>
  </div>;
}
