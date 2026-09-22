import { Link, useRouter } from "@tanstack/react-router";
import {
  ShoppingBag,
  Search,
  Menu,
  X,
  User,
  LogOut,
  Package,
  Home,
  Store,
  Newspaper,
  Info,
  Phone,
  Heart,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { useFavorites } from "@/hooks/use-favorites";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import siteLogo from "@/assets/site-logo-wide.png";

export function Header() {
  const { itemCount } = useCart();
  const { favoriteCount } = useFavorites();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [navHidden, setNavHidden] = useState(false);

  // Hysteresis-based hide/show so the collapsing second row can't oscillate:
  // hide only after scrolling past 140px, show again only above 60px.
  useEffect(() => {
    let frame = 0;
    let hidden = false;
    const evaluate = () => {
      frame = 0;
      const y = window.scrollY;
      if (!hidden && y > 140) {
        hidden = true;
        setNavHidden(true);
      } else if (hidden && y < 60) {
        hidden = false;
        setNavHidden(false);
      }
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(evaluate);
    };
    evaluate();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.invalidate();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.navigate({ to: "/products", search: { search: q } });
  };

  const navLinks = [
    { to: "/", label: "خانه", icon: Home },
    { to: "/products", label: "محصولات", icon: Store },
    { to: "/articles", label: "مقاله‌ها", icon: Newspaper },
    { to: "/about", label: "درباره ما", icon: Info },
    { to: "/contact", label: "ارتباط با ما", icon: Phone },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-card shadow-[0_3px_8px_-4px_rgba(0,0,0,0.16)]">
      <div className="container-shop flex h-[68px] items-center gap-5 md:h-[76px]">
        <Link to="/" className="shrink-0" aria-label="صفحه اصلی">
          <img
            src={siteLogo}
            alt="لوگوی فروشگاه"
            width={1152}
            height={576}
            className="h-[60px] w-auto md:h-[84px]"
          />
        </Link>

        <form onSubmit={handleSearch} className="relative mr-auto w-full max-w-[320px]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو..."
            className="h-11 w-full rounded-full border border-input bg-secondary/60 pr-4 pl-11 text-sm outline-none transition focus:bg-background focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="جستجو"
          />
          <button
            type="submit"
            aria-label="جستجو"
            className="absolute left-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <Search className="h-5 w-5" />
          </button>
        </form>

        <div className="ms-6 flex items-center gap-3 shrink-0 md:ms-10">
          <Link
            to="/favorites"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
            aria-label="علاقه‌مندی‌ها"
          >
            <Heart className="h-6 w-6" />
            {favoriteCount > 0 && (
              <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-medium text-destructive-foreground">
                {favoriteCount}
              </span>
            )}
          </Link>

          <Link
            to="/cart"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="سبد خرید"
          >
            <ShoppingBag className="h-6 w-6" />
            {itemCount > 0 && (
              <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-medium text-primary-foreground">
                {itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <Sheet>
              <SheetTrigger asChild>
                <button
                  className="hidden h-11 w-11 items-center justify-center rounded-md bg-secondary md:inline-flex"
                  aria-label="حساب کاربری"
                >
                  <User className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetTitle>حساب کاربری</SheetTitle>
                <div className="mt-6 flex flex-col gap-4">
                  <div className="rounded-lg bg-secondary p-4">
                    <p className="font-medium">{user.first_name || user.username}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Link
                    to="/orders"
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <Package className="h-4 w-4" />
                    سفارش‌های من
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    خروج
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Button variant="default" asChild className="hidden rounded-md md:inline-flex">
              <Link to="/login">ورود</Link>
            </Button>
          )}

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
                aria-label="منو"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle>منوی فروشگاه</SheetTitle>
              <nav className="mt-6 flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                    activeProps={{ className: "bg-accent text-foreground" }}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                ))}
                <hr className="my-2 border-border" />
                {user ? (
                  <>
                    <Link
                      to="/orders"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      <Package className="h-4 w-4" />
                      سفارش‌ها
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      خروج
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      ورود
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      ثبت‌نام
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Second row: main navigation, hides on scroll */}
      <div
        className={`hidden overflow-hidden transition-all duration-300 md:block ${
          navHidden ? "max-h-0 opacity-0" : "max-h-12 opacity-100"
        }`}
      >
        <nav className="container-shop flex h-10 items-center justify-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[15px] font-medium text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground whitespace-nowrap"
              activeProps={{ className: "text-foreground" }}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
