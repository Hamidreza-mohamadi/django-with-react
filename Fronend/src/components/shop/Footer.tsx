import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-secondary/50 py-12">
      <div className="container-shop grid gap-8 md:grid-cols-4">
        <div className="space-y-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShoppingBag className="h-3.5 w-3.5" />
            </div>
            <span>فروشگاه</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            تجربه خرید ساده و مدرن با بهترین محصولات.
          </p>
        </div>

        <div>
          <h4 className="mb-3 font-semibold">دسترسی سریع</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-foreground">
                خانه
              </Link>
            </li>
            <li>
              <Link to="/products" className="hover:text-foreground">
                محصولات
              </Link>
            </li>
            <li>
              <Link to="/articles" className="hover:text-foreground">
                مقاله‌ها
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-foreground">
                سبد خرید
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-semibold">حساب کاربری</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/login" className="hover:text-foreground">
                ورود
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-foreground">
                ثبت‌نام
              </Link>
            </li>
            <li>
              <Link to="/orders" className="hover:text-foreground">
                سفارش‌ها
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-semibold">تماس</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>support@shop.example</li>
            <li>۰۲۱-۱۲۳۴۵۶۷۸</li>
            <li>تهران، ایران</li>
          </ul>
        </div>
      </div>

      <div className="container-shop mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} فروشگاه. تمامی حقوق محفوظ است.
      </div>
    </footer>
  );
}
