import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Mail, MapPin, Phone } from "lucide-react";
import { getSiteSetting } from "@/lib/shop/api";

const settingQueryOptions = queryOptions({
  queryKey: ["site-setting"],
  queryFn: () => getSiteSetting(),
});

export const Route = createFileRoute("/about")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(settingQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "درباره ما | فروشگاه آنلاین" },
      { name: "description", content: "درباره فروشگاه، تیم ما و مسیری که برای تجربه خرید ساده‌تر طی کرده‌ایم." },
      { property: "og:title", content: "درباره ما | فروشگاه آنلاین" },
      { property: "og:description", content: "درباره فروشگاه، تیم ما و مسیری که برای تجربه خرید ساده‌تر طی کرده‌ایم." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data: setting } = useSuspenseQuery(settingQueryOptions);

  return (
    <div className="container-shop py-12" dir="rtl">
      <h1 className="text-3xl font-bold text-foreground">درباره ما</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {setting.about_us_text.split("\n\n").map((p, i) => (
            <p key={i} className="leading-8 text-muted-foreground">
              {p}
            </p>
          ))}
        </div>
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
