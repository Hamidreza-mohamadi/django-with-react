import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Heart, Package, UserRound, ShieldCheck, Save, LoaderCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { updateProfile } from "@/lib/shop/api";
import type { User } from "@/lib/shop/types";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountDashboard,
});

const initials = (user: User) =>
  [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.username;

function AccountDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarData, setAvatarData] = useState("");
  const [avatarName, setAvatarName] = useState("");
  const [avatarType, setAvatarType] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    setUsername(user.username ?? "");
    setFirstName(user.first_name ?? "");
    setLastName(user.last_name ?? "");
    setBio(user.about_user ?? "");
    setPreview(user.avatar ?? null);
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: () => updateProfile({
      data: {
        username,
        first_name: firstName,
        last_name: lastName,
        about_user: bio,
        ...(avatarData ? { avatarData, avatarName, avatarType } : {}),
      },
    }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["auth", "me"], updated);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      setMessage("پروفایل با موفقیت ذخیره شد.");
      setAvatarData("");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "ذخیره پروفایل ناموفق بود."),
  });

  const onAvatarChange = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("لطفاً یک فایل تصویری انتخاب کن.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("حجم تصویر باید کمتر از ۵ مگابایت باشد.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      setAvatarData(result);
      setAvatarName(file.name);
      setAvatarType(file.type);
      setPreview(result);
      setMessage("");
    };
    reader.readAsDataURL(file);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    saveMutation.mutate();
  };

  return (
    <div className="min-h-[75vh] bg-gradient-to-b from-primary/5 via-background to-background py-8 sm:py-12" dir="rtl">
      <div className="container-shop">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-primary">فضای شخصی شما</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">پنل کاربری</h1>
            <p className="mt-2 text-muted-foreground">اطلاعات حساب و نمایه‌ات را یک‌جا مدیریت کن.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            حساب شخصی و امن
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="h-24 bg-gradient-to-l from-primary/80 via-primary/50 to-sky-500/50" />
              <div className="-mt-12 px-6 pb-6">
                <div className="relative inline-block">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-secondary text-2xl font-bold text-foreground shadow-md">
                    {preview ? <img src={preview} alt="آواتار کاربر" className="h-full w-full object-cover" /> : <UserRound className="h-10 w-10 text-muted-foreground" />}
                  </div>
                  <label className="absolute -bottom-2 -left-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow" title="تغییر آواتار">
                    <Camera className="h-4 w-4" />
                    <input type="file" accept="image/*" className="sr-only" onChange={(event) => onAvatarChange(event.target.files?.[0])} />
                  </label>
                </div>
                <h2 className="mt-4 text-xl font-bold text-foreground">{user ? initials(user) : "کاربر فروشگاه"}</h2>
                <p className="mt-1 break-all text-sm text-muted-foreground">{user?.email}</p>
                <p className="mt-4 line-clamp-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{bio || "هنوز بیوگرافی‌ای برای پروفایل ثبت نکرده‌ای."}</p>
              </div>
            </section>

            <nav className="rounded-2xl border border-border bg-card p-2 shadow-sm">
              <Link to="/account" className="flex items-center gap-3 rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                <UserRound className="h-4 w-4" /> اطلاعات پروفایل
              </Link>
              <Link to="/favorites" className="mt-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-foreground transition hover:bg-secondary">
                <Heart className="h-4 w-4 text-rose-500" /> علاقه‌مندی‌های من
              </Link>
              <Link to="/orders" className="mt-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-foreground transition hover:bg-secondary">
                <Package className="h-4 w-4 text-sky-600" /> سفارش‌های من
              </Link>
            </nav>
          </aside>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
            <div className="mb-7 border-b border-border pb-5">
              <h2 className="text-xl font-bold text-foreground">اطلاعات شخصی</h2>
              <p className="mt-1 text-sm text-muted-foreground">اطلاعات زیر فقط برای حساب کاربری خودت ذخیره می‌شود.</p>
            </div>

            <form onSubmit={submit} className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium text-foreground">
                  نام کاربری
                  <input value={username} onChange={(e) => setUsername(e.target.value)} required className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
                </label>
                <label className="block text-sm font-medium text-foreground">
                  ایمیل
                  <input value={user?.email ?? ""} readOnly className="mt-2 w-full rounded-xl border border-input bg-muted/50 px-4 py-3 text-muted-foreground outline-none" />
                </label>
                <label className="block text-sm font-medium text-foreground">
                  نام
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
                </label>
                <label className="block text-sm font-medium text-foreground">
                  نام خانوادگی
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
                </label>
              </div>

              <label className="block text-sm font-medium text-foreground">
                درباره من
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} rows={5} placeholder="چند خط درباره خودت بنویس..." className="mt-2 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 leading-7 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
                <span className="mt-1 block text-left text-xs text-muted-foreground">{bio.length}/۲۰۰</span>
              </label>

              <div className="flex flex-col justify-between gap-4 border-t border-border pt-5 sm:flex-row sm:items-center">
                <p className="text-xs leading-6 text-muted-foreground">تصویر آواتار باید تصویری و حداکثر ۵ مگابایت باشد.</p>
                <button type="submit" disabled={saveMutation.isPending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
                  {saveMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saveMutation.isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </button>
              </div>
              {message && <p role="status" className={"rounded-xl px-4 py-3 text-sm " + (saveMutation.isError ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700")}>{message}</p>}
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
