import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),

  component: RegisterPage,
});

function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const router = useRouter();
  const search = Route.useSearch();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    router.navigate({ to: search.redirect || "/" });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = String(formData.get("password"));
    const confirmPassword = String(formData.get("confirmPassword"));

    if (password !== confirmPassword) {
      setError("رمز عبور و تکرار آن یکسان نیستند");
      setLoading(false);
      return;
    }

    try {
      await register({
        username: String(formData.get("username")),
        email: String(formData.get("email")),
        password,
        first_name: String(formData.get("first_name") || ""),
        last_name: String(formData.get("last_name") || ""),
      });
      router.navigate({ to: search.redirect || "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت‌نام ناموفق بود");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-shop flex min-h-[calc(100vh-8rem)] items-center justify-center py-12" dir="rtl">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">ایجاد حساب کاربری</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            برای خرید و پیگیری سفارش‌ها حساب بسازید.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="first_name" className="text-sm font-medium">
                نام
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm outline-none ring-ring focus-visible:ring-1"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="last_name" className="text-sm font-medium">
                نام خانوادگی
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm outline-none ring-ring focus-visible:ring-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              نام کاربری
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm outline-none ring-ring focus-visible:ring-1"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              ایمیل
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm outline-none ring-ring focus-visible:ring-1"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              رمز عبور
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm outline-none ring-ring focus-visible:ring-1"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={showPassword ? "مخفی کردن رمز" : "نمایش رمز"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              تکرار رمز عبور
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm outline-none ring-ring focus-visible:ring-1"
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            <UserPlus className="ml-2 h-4 w-4" />
            {loading ? "در حال ثبت‌نام..." : "ثبت‌نام"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          قبلاً حساب دارید؟{" "}
          <Link
            to="/login"
            search={{ redirect: search.redirect }}
            className="font-medium text-primary hover:underline"
          >
            وارد شوید
          </Link>
        </p>
      </div>
    </div>
  );
}
