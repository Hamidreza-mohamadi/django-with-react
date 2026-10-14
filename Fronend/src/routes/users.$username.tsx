import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, CalendarDays, UserRound } from "lucide-react";
import { getPublicProfile } from "@/lib/shop/api";

export const Route = createFileRoute("/users/$username")({
  component: PublicUserProfilePage,
});

function PublicUserProfilePage() {
  const { username } = Route.useParams();
  const fetchProfile = useServerFn(getPublicProfile);
  const { data: profile, isPending, isError } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: () => fetchProfile({ data: { username } }),
    retry: false,
  });

  const name = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || profile.username
    : username;

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-primary/5 via-background to-background py-10 sm:py-14" dir="rtl">
      <div className="container-shop max-w-4xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-primary">
          <ArrowRight className="h-4 w-4" /> بازگشت به فروشگاه
        </Link>

        {isPending ? (
          <div className="flex min-h-64 items-center justify-center rounded-3xl border border-border bg-card text-muted-foreground">
            <span className="ml-3 h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            در حال بارگذاری صفحه کاربر...
          </div>
        ) : isError || !profile ? (
          <div className="rounded-3xl border border-border bg-card px-6 py-16 text-center shadow-sm">
            <UserRound className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h1 className="mt-4 text-2xl font-extrabold text-foreground">این کاربر پیدا نشد</h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">ممکن است نام کاربری اشتباه باشد یا حساب در دسترس نباشد.</p>
            <Link to="/" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">رفتن به فروشگاه</Link>
          </div>
        ) : (
          <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="h-36 bg-gradient-to-l from-primary/90 via-primary/60 to-sky-500/60 sm:h-48" />
            <div className="px-6 pb-8 sm:px-10">
              <div className="-mt-16 flex flex-col gap-4 sm:-mt-20 sm:flex-row sm:items-end">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border-4 border-card bg-secondary text-foreground shadow-md sm:h-36 sm:w-36">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-14 w-14 text-muted-foreground" />
                  )}
                </div>
                <div className="pb-2">
                  <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">{name}</h1>
                  <p className="mt-1 text-sm text-muted-foreground" dir="ltr">@{profile.username}</p>
                </div>
              </div>

              <section className="mt-8 border-t border-border pt-6">
                <h2 className="text-sm font-bold text-foreground">درباره من</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-muted-foreground">
                  {profile.about_user?.trim() || "این کاربر هنوز بیوگرافی‌ای ثبت نکرده است."}
                </p>
              </section>

              <div className="mt-8 flex items-center gap-2 border-t border-border pt-5 text-xs text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                صفحه عمومی کاربر
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
