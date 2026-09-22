import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),

  component: LoginPage,
});

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
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
    try {
      await login({
        username: String(formData.get("username")),
        password: String(formData.get("password")),
      });
      router.navigate({ to: search.redirect || "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "ورود ناموفق بود");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-shop flex min-h-[calc(100vh-8rem)] items-center justify-center py-12" dir="rtl">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">ورود به حساب</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            برای ادامه خرید وارد حساب کاربری خود شوید.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <label htmlFor="password" className="text-sm font-medium">
              رمز عبور
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
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

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            <LogIn className="ml-2 h-4 w-4" />
            {loading ? "در حال ورود..." : "ورود"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          حساب ندارید؟{" "}
          <Link
            to="/register"
            search={{ redirect: search.redirect }}
            className="font-medium text-primary hover:underline"
          >
            ثبت‌نام کنید
          </Link>
        </p>
      </div>
    </div>
  );
}
