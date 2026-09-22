import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { Package, Calendar, ChevronLeft } from "lucide-react";
import { getOrders } from "@/lib/shop/api";
import { Badge } from "@/components/ui/badge";

const ordersQueryOptions = queryOptions({
  queryKey: ["orders"],
  queryFn: () => getOrders(),
});

export const Route = createFileRoute("/_authenticated/orders")({
  loader: ({ context }) => context.queryClient.ensureQueryData(ordersQueryOptions),
  component: OrdersPage,
});

const statusLabels: Record<string, string> = {
  pending: "در انتظار پرداخت",
  processing: "در حال پردازش",
  shipped: "ارسال شده",
  delivered: "تحویل داده شده",
  cancelled: "لغو شده",
};

const statusColors: Record<string, string> = {
  pending: "bg-warning text-warning-foreground",
  processing: "bg-primary text-primary-foreground",
  shipped: "bg-shop text-shop-foreground",
  delivered: "bg-success text-success-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

function OrdersPage() {
  const { data: orders } = useSuspenseQuery(ordersQueryOptions);

  const formatPrice = (price: number) => new Intl.NumberFormat("fa-IR").format(price);
  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(date));

  return (
    <div className="container-shop py-8" dir="rtl">
      <h1 className="text-3xl font-bold text-foreground">سفارش‌های من</h1>

      {orders && orders.length > 0 ? (
        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/20"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground">سفارش #{order.id}</span>
                    <Badge className={statusColors[order.status] || "bg-muted text-muted-foreground"}>
                      {statusLabels[order.status] || order.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatDate(order.created_at)}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="text-lg font-bold text-foreground">
                    {formatPrice(order.total)} تومان
                  </span>
                  <button className="flex items-center text-sm font-medium text-primary hover:underline">
                    جزئیات
                    <ChevronLeft className="mr-1 h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 py-20 text-center">
          <Package className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">سفارشی ثبت نشده</h3>
          <p className="mt-1 text-sm text-muted-foreground">هنوز سفارشی ندارید. محصولات را بررسی کنید.</p>
        </div>
      )}
    </div>
  );
}
