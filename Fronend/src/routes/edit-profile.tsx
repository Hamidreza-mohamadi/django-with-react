import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { updateProfile } from "@/lib/shop/api";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/edit-profile")({ component: EditProfilePage });

function EditProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const saveProfile = useServerFn(updateProfile);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setMessage(""); setLoading(true);
    const form = new FormData(e.currentTarget);
    const file = form.get("avatar");
    let avatarData: string | undefined;
    if (file instanceof File && file.size > 0) {
      if (!file.type.startsWith("image/")) { setError("لطفاً یک فایل تصویری انتخاب کنید."); setLoading(false); return; }
      if (file.size > 5 * 1024 * 1024) { setError("حجم تصویر باید کمتر از ۵ مگابایت باشد."); setLoading(false); return; }
      avatarData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("خواندن تصویر ناموفق بود.")); reader.readAsDataURL(file);
      });
    }
    try {
      await saveProfile({ data: { username: String(form.get("username")), first_name: String(form.get("first_name") || ""), last_name: String(form.get("last_name") || ""), about_user: String(form.get("about_user") || ""), avatarData, avatarName: file instanceof File ? file.name : undefined, avatarType: file instanceof File ? file.type : undefined } });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      setMessage("تغییرات پروفایل ذخیره شد.");
    } catch (err) { setError(err instanceof Error ? err.message : "ذخیره تغییرات ناموفق بود."); }
    finally { setLoading(false); }
  }

  if (isLoading) return <div className="container-shop py-12">در حال بارگذاری...</div>;
  if (!isAuthenticated || !user) { void router.navigate({ to: "/login", search: { redirect: "/edit-profile" } }); return null; }

  return <div dir="rtl" className="container-shop flex justify-center py-12">
    <div className="w-full max-w-2xl space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div><h1 className="text-2xl font-bold">ویرایش پروفایل</h1><p className="mt-2 text-sm text-muted-foreground">اطلاعات شخصی، آواتار و درباره من را مدیریت کنید.</p></div>
      {user.avatar && <img src={user.avatar} alt="آواتار فعلی" className="h-24 w-24 rounded-full border border-border object-cover" />}
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-2 text-sm font-medium">نام کاربری<input name="username" defaultValue={user.username} required className="w-full rounded-md border border-input bg-background px-4 py-2 font-normal" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2 text-sm font-medium">نام<input name="first_name" defaultValue={user.first_name || ""} className="w-full rounded-md border border-input bg-background px-4 py-2 font-normal" /></label>
          <label className="block space-y-2 text-sm font-medium">نام خانوادگی<input name="last_name" defaultValue={user.last_name || ""} className="w-full rounded-md border border-input bg-background px-4 py-2 font-normal" /></label>
        </div>
        <label className="block space-y-2 text-sm font-medium">درباره من<textarea name="about_user" maxLength={200} defaultValue={user.about_user || ""} rows={4} className="w-full rounded-md border border-input bg-background px-4 py-2 font-normal" /></label>
        <label className="block space-y-2 text-sm font-medium">آواتار<input name="avatar" type="file" accept="image/*" className="block w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium" /><span className="text-xs font-normal text-muted-foreground">فقط تصویر، حداکثر ۵ مگابایت. برای حفظ تصویر فعلی، این فیلد را خالی بگذارید.</span></label>
        {message && <p className="rounded-md bg-primary/10 p-3 text-sm">{message}</p>}
        {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "در حال ذخیره..." : "ذخیره تغییرات"}</Button>
      </form>
    </div>
  </div>;
}
