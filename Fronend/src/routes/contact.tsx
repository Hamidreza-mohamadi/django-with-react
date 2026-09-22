import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { Mail, MapPin, Phone, Printer } from "lucide-react";
import { toast } from "sonner";
import { getSiteSetting } from "@/lib/shop/api";
import { Button } from "@/components/ui/button";

const settingQueryOptions = queryOptions({
  queryKey: ["site-setting"],
  queryFn: () => getSiteSetting(),
});

export const Route = createFileRoute("/contact")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(settingQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "ارتباط با ما | فروشگاه آنلاین" },
      { name: "description", content: "راه‌های تماس با پشتیبانی فروشگاه: تلفن، ایمیل، آدرس و فرم ارسال پیام." },
      { property: "og:title", content: "ارتباط با ما | فروشگاه آنلاین" },
      { property: "og:description", content: "راه‌های تماس با پشتیبانی فروشگاه: تلفن، ایمیل، آدرس و فرم ارسال پیام." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { data: setting } = useSuspenseQuery(settingQueryOptions);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("پیام شما ثبت شد. به‌زودی پاسخ می‌دهیم.");
    setForm({ name: "", email: "", message: "" });
  };

  const field =
    "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="container-shop py-12" dir="rtl">
      <h1 className="text-3xl font-bold text-foreground">ارتباط با ما</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">نام</label>
              <input
                className={field}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">ایمیل</label>
              <input
                type="email"
                className={field}
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">پیام</label>
            <textarea
              rows={6}
              required
              className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
          <Button type="submit">ارسال پیام</Button>
        </form>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">{setting.site_name}</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {setting.address && (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                {setting.address}
              </li>
            )}
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" />
              {setting.phone}
            </li>
            {setting.fax && (
              <li className="flex items-center gap-2">
                <Printer className="h-4 w-4 shrink-0" />
                {setting.fax}
              </li>
            )}
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              {setting.email}
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
