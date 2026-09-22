import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const slides = [
  {
    src: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&q=80",
    alt: "فروشگاه مد و پوشاک",
    title: "خریدی ساده، سریع و مطمئن",
    subtitle: "جدیدترین محصولات را با بهترین قیمت کشف کنید.",
  },
  {
    src: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1920&q=80",
    alt: "محصولات الکترونیک",
    title: "دنیای الکترونیک در دستان شما",
    subtitle: "گجت‌ها و ابزارهای دیجیتال با ضمانت اصالت.",
  },
  {
    src: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1920&q=80",
    alt: "دکوراسیون منزل",
    title: "خانه‌ای دلنشین‌تر",
    subtitle: "دکور و لوازم منزل با طراحی مدرن.",
  },
  {
    src: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&q=80",
    alt: "پیشنهادهای ویژه",
    title: "پیشنهادهای ویژه این هفته",
    subtitle: "تخفیف‌های شگفت‌انگیز روی محصولات منتخب.",
  },
];

export function HeroSlider() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const go = (i: number) => setIndex((i + slides.length) % slides.length);

  return (
    <div className="relative w-full overflow-hidden h-[280px] md:h-[360px] lg:h-[420px]">
      <div
        className="flex h-full w-full transition-transform duration-700 ease-out"
        style={{ transform: `translateX(${index * 100}%)` }}
      >
        {slides.map((s) => (
          <div key={s.src} className="relative h-full w-full flex-shrink-0">
            <img src={s.src} alt={s.alt} className="h-full w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/30 to-transparent" />
            <div className="container-shop absolute inset-0 flex items-center" dir="rtl">
              <div className="max-w-xl space-y-5 text-white">
                <h1 className="text-3xl font-bold leading-tight md:text-5xl lg:text-6xl">
                  {s.title}
                </h1>
                <p className="text-base text-white/90 md:text-lg">{s.subtitle}</p>
                <div className="flex gap-3">
                  <Button size="lg" asChild>
                    <Link to="/products">
                      <ShoppingBag className="ml-2 h-5 w-5" />
                      مشاهده محصولات
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="bg-white/10 text-white hover:bg-white/20 border-white/40" asChild>
                    <Link to="/articles">مقاله‌ها</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => go(index - 1)}
        aria-label="اسلاید قبلی"
        className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow backdrop-blur transition hover:bg-background"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => go(index + 1)}
        aria-label="اسلاید بعدی"
        className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow backdrop-blur transition hover:bg-background"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`اسلاید ${i + 1}`}
            className={`h-2 rounded-full transition-all ${
              i === index ? "w-8 bg-white" : "w-2 bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
