import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { requestPasswordReset } from "@/lib/shop/api";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/forget-pass")({ component: ForgetPasswordPage });

function ForgetPasswordPage() {
  const requestReset = useServerFn(requestPasswordReset);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setMessage(""); setLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const result = await requestReset({ data: { email: String(form.get("email")) } });
      setMessage(result.detail);
    } catch (err) { setError(err instanceof Error ? err.message : "ارسال درخواست ناموفق بود."); }
    finally { setLoading(false); }
  }

  return <div dir="rtl" className="container-shop flex min-h-[60vh] items-center justify-center py-12">
    <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="text-center"><h1 className="text-2xl font-bold">فراموشی رمز عبور</h1><p className="mt-2 text-sm text-muted-foreground">ایمیل حساب خود را وارد کنید تا لینک بازیابی برایتان ارسال شود.</p></div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-2 text-sm font-medium">ایمیل<input name="email" type="email" required className="w-full rounded-md border border-input bg-background px-4 py-2 font-normal" /></label>
        {message && <p className="rounded-md bg-primary/10 p-3 text-sm">{message}</p>}
        {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <Button className="w-full" type="submit" disabled={loading}>{loading ? "در حال ارسال..." : "ارسال لینک بازیابی"}</Button>
      </form>
      <p className="text-center text-sm"><Link to="/login" className="text-primary hover:underline">بازگشت به ورود</Link></p>
    </div>
  </div>;
}
