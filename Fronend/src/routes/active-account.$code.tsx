import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { activateAccount } from "@/lib/shop/api";

export const Route = createFileRoute("/active-account/$code")({ component: ActiveAccountPage });

function ActiveAccountPage() {
  const { code } = Route.useParams();
  const activate = useServerFn(activateAccount);
  const [message, setMessage] = useState("در حال بررسی لینک فعال‌سازی...");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    activate({ data: { code } })
      .then((result) => { if (!cancelled) setMessage(result.detail); })
      .catch((error) => { if (!cancelled) { setFailed(true); setMessage(error instanceof Error ? error.message : "لینک فعال‌سازی معتبر نیست."); } });
    return () => { cancelled = true; };
  }, [activate, code]);

  return <div dir="rtl" className="container-shop flex min-h-[60vh] items-center justify-center py-12">
    <div className="w-full max-w-lg space-y-5 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold">فعال‌سازی حساب</h1>
      <p className={failed ? "text-destructive" : "text-muted-foreground"}>{message}</p>
      {!failed && !message.startsWith("در حال") && <Link to="/login" className="inline-flex rounded-md bg-primary px-4 py-2 text-primary-foreground">ورود به حساب</Link>}
      {failed && <Link to="/register" className="text-primary hover:underline">بازگشت به ثبت‌نام</Link>}
    </div>
  </div>;
}
