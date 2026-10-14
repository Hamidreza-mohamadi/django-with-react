import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Heart, Package, Settings2, UserRound, ShieldCheck, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { User } from "@/lib/shop/types";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountDashboard,
});

const displayName = (user: User) =>
  [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.username;

function AccountDashboard() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-[75vh] bg-gradient-to-b from-primary/5 via-background to-background py-8 sm:py-12" dir="rtl">
      <div className="container-shop">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-primary">خوش آمدی، {displayName(user)}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">پنل کاربری</h1>
            <p className="mt-2 text-muted-foreground">مدیریت حساب، سفارش‌ها و علاقه‌مندی‌ها</p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground sm:self-auto">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            فضای شخصی شما
          </div>
        </header>

        <section className="relative mb-6 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="h-32 bg-gradient-to-l from-primary/90 via-primary/60 to-sky-500/60 sm:h-40" />
          <div className="px-5 pb-6 sm:px-8">
            <div className="-mt-14 flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-card bg-secondary text-2xl font-bold text-foreground shadow-md sm:h-28 sm:w-28">
                  {user.avatar ? <img src={user.avatar} alt={displayName(user)} className="h-full w-full object-cover" /> : <UserRound className="h-11 w-11 text-muted-foreground" />}
                </div>
                <div className="pb-1">
                  <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">{displayName(user)}</h2>
                  <p className="mt-1 text-sm text-muted-foreground" dir="ltr">@{user.username}</p>
                </div>
              </div>
              <Link to="/edit-profile" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/5">
                <Settings2 className="h-4 w-4" /> ویرایش اطلاعات شخصی <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-5 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {user.about_user?.trim() || "هنوز بیوگرافی‌ای برای پروفایل ثبت نکرده‌ای."}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
              <span className="break-all">{user.email}</span>
              <Link to="/users/$username" params={{ username: user.username }} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                مشاهده صفحه عمومی من <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link to="/orders" className="group flex min-h-36 items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:p-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600"><Package className="h-7 w-7" /></div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-foreground">سفارش‌های من</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">مشاهده وضعیت و جزئیات سفارش‌ها</p>
            </div>
            <ArrowLeft className="h-5 w-5 text-muted-foreground transition group-hover:-translate-x-1 group-hover:text-primary" />
          </Link>
          <Link to="/favorites" className="group flex min-h-36 items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:p-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500"><Heart className="h-7 w-7" /></div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-foreground">علاقه‌مندی‌های من</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">محصول‌هایی که برای بعد ذخیره کرده‌ای</p>
            </div>
            <ArrowLeft className="h-5 w-5 text-muted-foreground transition group-hover:-translate-x-1 group-hover:text-primary" />
          </Link>
        </div>
      </div>
    </div>
  );
}
