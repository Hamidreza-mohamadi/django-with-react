import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { resetPassword } from "@/lib/shop/api";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/rewrite-pass/$code")({ component: RewritePasswordPage });

function RewritePasswordPage() {
  const { code } = Route.useParams();
  const router = useRouter();
  const reset = useServerFn(resetPassword);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setLoading(true);
    const form = new FormData(e.currentTarget);
    const new_password = String(form.get("new_password"));
    const confirm_password = String(form.get("confirm_password"));
    if (new_password !== confirm_password) { setError("رمز عبور و تکرار آن یکسان نیستند."); setLoading(false); return; }
    try { await reset({ data: { code, new_password, confirm_password } }); await router.navigate({ to: "/login" }); }
    catch (err) { setError(err instanceof Error ? err.message : "تغییر رمز عبور ناموفق بود."); }
    finally { setLoading(false); }
  }

  return <div dir="rtl" className="container-shop flex min-h-[60vh] items-center justify-center py-12">
    <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="text-center"><h1 className="text-2xl font-bold">تعیین رمز عبور جدید</h1><p className="mt-2 text-sm text-muted-foreground">رمز عبور جدید را وارد کنید.</p></div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-2 text-sm font-medium">رمز عبور جدید<input name="new_password" type="password" required className="w-full rounded-md border border-input bg-background px-4 py-2 font-normal" /></label>
        <label className="block space-y-2 text-sm font-medium">تکرار رمز عبور<input name="confirm_password" type="password" required className="w-full rounded-md border border-input bg-background px-4 py-2 font-normal" /></label>
        {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <Button className="w-full" type="submit" disabled={loading}>{loading ? "در حال ذخیره..." : "ذخیره رمز عبور"}</Button>
      </form>
      <p className="text-center text-sm"><Link to="/login" className="text-primary hover:underline">بازگشت به ورود</Link></p>
    </div>
  </div>;
}
