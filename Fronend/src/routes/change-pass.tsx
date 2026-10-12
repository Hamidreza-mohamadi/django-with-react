import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { changePassword } from "@/lib/shop/api";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/change-pass")({ component: ChangePasswordPage });

function ChangePasswordPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const change = useServerFn(changePassword);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setMessage(""); setLoading(true);
    const form = new FormData(e.currentTarget);
    const old_password = String(form.get("old_password"));
    const new_password = String(form.get("new_password"));
    const confirm_password = String(form.get("confirm_password"));
    if (new_password !== confirm_password) { setError("رمز عبور جدید و تکرار آن یکسان نیستند."); setLoading(false); return; }
    try { const result = await change({ data: { old_password, new_password, confirm_password } }); setMessage(result.detail); (e.currentTarget as HTMLFormElement).reset(); }
    catch (err) { setError(err instanceof Error ? err.message : "تغییر رمز عبور ناموفق بود."); }
    finally { setLoading(false); }
  }

  if (isLoading) return <div className="container-shop py-12">در حال بارگذاری...</div>;
  if (!isAuthenticated) { void router.navigate({ to: "/login", search: { redirect: "/change-pass" } }); return null; }

  return <div dir="rtl" className="container-shop flex min-h-[60vh] items-center justify-center py-12">
    <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
      <h1 className="text-center text-2xl font-bold">تغییر رمز عبور</h1>
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-2 text-sm font-medium">رمز عبور فعلی<input name="old_password" type="password" required className="w-full rounded-md border border-input bg-background px-4 py-2 font-normal" /></label>
        <label className="block space-y-2 text-sm font-medium">رمز عبور جدید<input name="new_password" type="password" required className="w-full rounded-md border border-input bg-background px-4 py-2 font-normal" /></label>
        <label className="block space-y-2 text-sm font-medium">تکرار رمز عبور جدید<input name="confirm_password" type="password" required className="w-full rounded-md border border-input bg-background px-4 py-2 font-normal" /></label>
        {message && <p className="rounded-md bg-primary/10 p-3 text-sm">{message}</p>}
        {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <Button className="w-full" type="submit" disabled={loading}>{loading ? "در حال ذخیره..." : "تغییر رمز عبور"}</Button>
      </form>
      <p className="text-center text-sm"><Link to="/" className="text-primary hover:underline">بازگشت به فروشگاه</Link></p>
    </div>
  </div>;
}
