import type { Article, Category, Product, SiteSetting } from "@/lib/shop/types";
import {
  mockArticles,
  mockCategories,
  mockProducts,
  mockSiteSetting,
} from "@/lib/shop/mock";

type RuntimeGlobals = typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

function runtimeEnv(name: string): string | undefined {
  return (globalThis as RuntimeGlobals).process?.env?.[name]?.trim() || undefined;
}

function apiBaseUrl(): string | undefined {
  return runtimeEnv("DJANGO_API_BASE_URL");
}

async function djangoFetch<T>(path: string): Promise<T> {
  const base = apiBaseUrl()!;
  const response = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Django API request failed [${response.status}] for ${path}`);
  }
  return (await response.json()) as T;
}

export async function listProducts(input: {
  category?: string;
  search?: string;
  limit?: number;
}): Promise<Product[]> {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  let products: Product[];

  if (!apiBaseUrl()) {
    products = mockProducts;
    if (input.category) {
      products = products.filter((p) => p.category?.slug === input.category);
    }
    if (input.search) {
      const q = input.search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.brand ?? "").toLowerCase().includes(q),
      );
    }
  } else {
    const params = new URLSearchParams();
    if (input.category) params.set("category", input.category);
    if (input.search) params.set("search", input.search);
    products = await djangoFetch<Product[]>(`/products/?${params.toString()}`);
  }

  return products.slice(0, limit);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!apiBaseUrl()) {
    return mockProducts.find((p) => p.slug === slug) ?? null;
  }
  try {
    return await djangoFetch<Product>(`/products/${slug}/`);
  } catch {
    return null;
  }
}

export async function listCategories(): Promise<Category[]> {
  if (!apiBaseUrl()) return mockCategories;
  return djangoFetch<Category[]>("/categories/");
}

export async function listArticles(input: {
  search?: string;
  limit?: number;
}): Promise<Article[]> {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
  let articles: Article[];

  if (!apiBaseUrl()) {
    articles = mockArticles.filter((a) => a.is_published);
    if (input.search) {
      const q = input.search.toLowerCase();
      articles = articles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.short_description.toLowerCase().includes(q),
      );
    }
  } else {
    const params = new URLSearchParams();
    if (input.search) params.set("search", input.search);
    articles = await djangoFetch<Article[]>(`/articles/?${params.toString()}`);
  }

  return articles.slice(0, limit);
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  if (!apiBaseUrl()) {
    return mockArticles.find((a) => a.slug === slug) ?? null;
  }
  try {
    return await djangoFetch<Article>(`/articles/${slug}/`);
  } catch {
    return null;
  }
}

export async function getSiteInfo(): Promise<SiteSetting> {
  if (!apiBaseUrl()) return mockSiteSetting;
  return djangoFetch<SiteSetting>("/site-settings/main/");
}
