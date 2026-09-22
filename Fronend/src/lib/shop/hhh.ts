import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import type {
  Category,
  Product,
  ProductFilters,
  ProductFilterOptions,
  User,
  LoginCredentials,
  RegisterCredentials,
  Order,
  Article,
  ArticleComment,
  ProductComment,
  SiteSetting,
} from "./types";
import {
  mockCategories,
  mockProducts,
  mockArticles,
  mockArticleComments,
  mockProductComments,
  mockSiteSetting,
} from "./mock";

const API_BASE_URL = () => process.env.DJANGO_API_BASE_URL || "http://localhost:8000/api/v1";
const USE_MOCK = () => !process.env.DJANGO_API_BASE_URL;

const AUTH_COOKIE = "django_auth_token";

async function djangoFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getCookie(AUTH_COOKIE);
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL()}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// Products
export const getProducts = createServerFn({ method: "GET" })
  .validator((data: ProductFilters = {}) => data)
  .handler(async ({ data }) => {
    // if (USE_MOCK()) {
    //   let products = [...mockProducts];
    //   if (data.category) {
    //     products = products.filter((p) => p.category?.slug === data.category);
    //   }
    //   if (data.search) {
    //     const q = data.search.toLowerCase();
    //     products = products.filter(
    //       (p) =>
    //         p.name.toLowerCase().includes(q) ||
    //         p.description.toLowerCase().includes(q) ||
    //         (p.brand ?? "").toLowerCase().includes(q),
    //     );
    //   }
    //   if (data.brand?.length) {
    //     products = products.filter((p) => !!p.brand && data.brand!.includes(p.brand));
    //   }
    //   if (data.color?.length) {
    //     products = products.filter((p) => (p.colors ?? []).some((c) => data.color!.includes(c)));
    //   }
    //   if (typeof data.min_price === "number") {
    //     products = products.filter((p) => p.price >= data.min_price!);
    //   }
    //   if (typeof data.max_price === "number") {
    //     products = products.filter((p) => p.price <= data.max_price!);
    //   }
    //   if (data.in_stock) {
    //     products = products.filter((p) => p.stock > 0 && p.is_available);
    //   }
    //   const popularity = (p: Product) => p.sales_count ?? p.stock;
    //   const seen = (p: Product) => p.views ?? p.id;
    //   switch (data.ordering) {
    //     case "price":
    //       products.sort((a, b) => a.price - b.price);
    //       break;
    //     case "-price":
    //       products.sort((a, b) => b.price - a.price);
    //       break;
    //     case "-sales_count":
    //       products.sort((a, b) => popularity(b) - popularity(a));
    //       break;
    //     case "-views":
    //       products.sort((a, b) => seen(b) - seen(a));
    //       break;
    //     case "-created_at":
    //     default:
    //       products.sort((a, b) => b.id - a.id);
    //       break;
    //   }
    //   return products;
    // }

    const params = new URLSearchParams();
    if (data.category) params.set("category", data.category);
    if (data.search) params.set("search", data.search);
    if (data.page) params.set("page", String(data.page));
    for (const brand of data.brand ?? []) params.append("brand", brand);
    for (const color of data.color ?? []) params.append("color", color);
    if (typeof data.min_price === "number") params.set("min_price", String(data.min_price));
    if (typeof data.max_price === "number") params.set("max_price", String(data.max_price));
    if (data.in_stock) params.set("in_stock", "true");
    if (data.ordering) params.set("ordering", data.ordering);

    return djangoFetch<Product[]>(`/products/?${params.toString()}`);
  });

// Filter options (brands / colors / max price) — resolved by the backend
export const getProductFilterOptions = createServerFn({ method: "GET" })
  .validator((data: { category?: string } = {}) => data)
  .handler(async ({ data }): Promise<ProductFilterOptions> => {
    if (USE_MOCK()) {
      const scoped = data.category
        ? mockProducts.filter((p) => p.category?.slug === data.category)
        : mockProducts;
      return {
        brands: Array.from(new Set(scoped.map((p) => p.brand).filter(Boolean) as string[])),
        colors: Array.from(new Set(scoped.flatMap((p) => p.colors ?? []))),
        max_price: scoped.reduce((m, p) => Math.max(m, p.price), 0),
      };
    }
    const params = new URLSearchParams();
    if (data.category) params.set("category", data.category);
    return djangoFetch<ProductFilterOptions>(`/products/filters/?${params.toString()}`);
  });

export const getProduct = createServerFn({ method: "GET" })
  .validator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    // if (USE_MOCK()) {
    //   const product = mockProducts.find((p) => p.slug === data.slug);
    //   if (!product) throw new Error("Product not found");
    //   return product;
    // }
    return djangoFetch<Product>(`/products/${data.slug}/`);
  });

// Categories
export const getCategories = createServerFn({ method: "GET" }).handler(async () => {
  if (USE_MOCK()) return mockCategories;
  return djangoFetch<Category[]>("/categories/");
});

// Auth
export const login = createServerFn({ method: "POST" })
  .validator((data: LoginCredentials) => data)
  .handler(async ({ data }) => {
    if (USE_MOCK()) {
      const user: User = {
        id: 1,
        username: data.username,
        email: `${data.username}@example.com`,
        first_name: "Demo",
        last_name: "User",
      };
      setCookie(AUTH_COOKIE, "mock_token_123", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      return { user, token: "mock_token_123" };
    }

    const result = await djangoFetch<{ token: string; user: User }>("/auth/login/", {
      method: "POST",
      body: JSON.stringify(data),
    });

    setCookie(AUTH_COOKIE, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return result;
  });

export const register = createServerFn({ method: "POST" })
  .validator((data: RegisterCredentials) => data)
  .handler(async ({ data }) => {
    if (USE_MOCK()) {
      const user: User = {
        id: 1,
        username: data.username,
        email: data.email,
        first_name: data.first_name || "",
        last_name: data.last_name || "",
      };
      setCookie(AUTH_COOKIE, "mock_token_123", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      return { user, token: "mock_token_123" };
    }

    const result = await djangoFetch<{ token: string; user: User }>("/auth/register/", {
      method: "POST",
      body: JSON.stringify(data),
    });

    setCookie(AUTH_COOKIE, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return result;
  });

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie(AUTH_COOKIE);
  if (!token) return null;

  if (USE_MOCK()) {
    return {
      id: 1,
      username: "demo",
      email: "demo@example.com",
      first_name: "Demo",
      last_name: "User",
    } as User;
  }

  try {
    return await djangoFetch<User>("/auth/me/");
  } catch {
    deleteCookie(AUTH_COOKIE);
    return null;
  }
});

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(AUTH_COOKIE);
  return { success: true };
});

// Orders
export const getOrders = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie(AUTH_COOKIE);
  if (!token) throw new Error("Unauthorized");

  if (USE_MOCK()) {
    return [
      {
        id: 1001,
        status: "delivered",
        total: 1290000,
        created_at: "2024-12-15T10:30:00Z",
        items: [],
      },
    ] as Order[];
  }

  return djangoFetch<Order[]>("/orders/");
});

export const createOrder = createServerFn({ method: "POST" })
  .validator((data: { items: { product_id: number; quantity: number }[]; shipping_address: string }) => data)
  .handler(async ({ data }) => {
    const token = getCookie(AUTH_COOKIE);
    if (!token) throw new Error("Unauthorized");

    if (USE_MOCK()) {
      return {
        id: 1002,
        status: "pending",
        total: 0,
        created_at: new Date().toISOString(),
        items: [],
      } as Order;
    }

    return djangoFetch<Order>("/orders/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

// Articles
export const getArticles = createServerFn({ method: "GET" })
  .validator((data: { category?: string; search?: string } = {}) => data)
  .handler(async ({ data }) => {
    // if (USE_MOCK()) {
    //   let articles = mockArticles.filter((a) => a.is_published);
    //   if (data.search) {
    //     const q = data.search.toLowerCase();
    //     articles = articles.filter(
    //       (a) => a.title.toLowerCase().includes(q) || a.short_description.toLowerCase().includes(q),
    //     );
    //   }
    //   return articles;
    // }
    const params = new URLSearchParams();
    if (data.category) params.set("category", data.category);
    if (data.search) params.set("search", data.search);
    return djangoFetch<Article[]>(`/articles/?${params.toString()}`);
  });

export const getArticle = createServerFn({ method: "GET" })
  .validator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    // if (USE_MOCK()) {
    //   const article = mockArticles.find((a) => a.slug === data.slug);
    //   if (!article) throw new Error("Article not found");
    //   return article;
    // }
    return djangoFetch<Article>(`/articles/${data.slug}/`);
  });

export const getArticleComments = createServerFn({ method: "GET" })
  .validator((data: { articleId: number }) => data)
  .handler(async ({ data }) => {
    if (USE_MOCK()) {
      return mockArticleComments.filter((c) => c.article === data.articleId && c.is_approved);
    }
    return djangoFetch<ArticleComment[]>(`/articles/${data.articleId}/comments/`);
  });

export const createArticleComment = createServerFn({ method: "POST" })
  .validator((data: { article: number; text: string; parent?: number | null }) => data)
  .handler(async ({ data }) => {
    if (USE_MOCK()) {
      return {
        id: Date.now(),
        article: data.article,
        user: "شما",
        text: data.text,
        create_date: new Date().toISOString(),
        is_approved: true,
        parent: data.parent ?? null,
      } as ArticleComment;
    }
    return djangoFetch<ArticleComment>(`/articles/${data.article}/comments/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

// Product comments
export const getProductComments = createServerFn({ method: "GET" })
  .validator((data: { productId: number }) => data)
  .handler(async ({ data }) => {
    if (USE_MOCK()) {
      return mockProductComments.filter((c) => c.product === data.productId && c.is_approved);
    }
    return djangoFetch<ProductComment[]>(`/products/${data.productId}/comments/`);
  });

export const createProductComment = createServerFn({ method: "POST" })
  .validator((data: { product: number; text: string; rate: number; parent?: number | null }) => data)
  .handler(async ({ data }) => {
    if (USE_MOCK()) {
      return {
        id: Date.now(),
        product: data.product,
        user: "شما",
        text: data.text,
        create_date: new Date().toISOString(),
        is_approved: true,
        parent: data.parent ?? null,
        rate: data.rate,
      } as ProductComment;
    }
    return djangoFetch<ProductComment>(`/products/${data.product}/comments/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

// Site settings
export const getSiteSetting = createServerFn({ method: "GET" }).handler(async () => {
  // if (USE_MOCK()) return mockSiteSetting;
  return djangoFetch<SiteSetting>("/site-settings/main/");
});
