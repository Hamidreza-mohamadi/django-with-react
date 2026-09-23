import { createServerFn } from "@tanstack/react-start";
import {
  getCookie,
  setCookie,
  deleteCookie,
} from "@tanstack/react-start/server";
import type {
  Article,
  ArticleComment,
  Category,
  LoginCredentials,
  Order,
  Product,
  ProductComment,
  ProductFilterOptions,
  ProductFilters,
  RegisterCredentials,
  SiteSetting,
  User,
} from "./types";
import {
  mockArticles,
  mockArticleComments,
  mockCategories,
  mockProductComments,
  mockProducts,
  mockSiteSetting,
} from "./mock";

const API_BASE_URL = () =>
  process.env.DJANGO_API_BASE_URL || "http://localhost:8000/api/v1";
const USE_MOCK = () => !process.env.DJANGO_API_BASE_URL;

const ACCESS_COOKIE = "django_access_token";
const REFRESH_COOKIE = "django_refresh_token";
const ACCESS_MAX_AGE = 60 * 15;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/",
  };
}

function clearAuthCookies() {
  deleteCookie(ACCESS_COOKIE);
  deleteCookie(REFRESH_COOKIE);
}

function setAuthCookies(access: string, refresh?: string) {
  setCookie(ACCESS_COOKIE, access, cookieOptions(ACCESS_MAX_AGE));
  if (refresh) {
    setCookie(REFRESH_COOKIE, refresh, cookieOptions(REFRESH_MAX_AGE));
  }
}

async function refreshAccessToken() {
  const refresh = getCookie(REFRESH_COOKIE);
  if (!refresh) return null;

  const response = await fetch(
    `${API_BASE_URL()}/auth/token/refresh/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    },
  );

  if (!response.ok) {
    clearAuthCookies();
    return null;
  }

  const result = (await response.json()) as {
    access?: string;
    refresh?: string;
  };
  if (!result.access) {
    clearAuthCookies();
    return null;
  }

  setAuthCookies(result.access, result.refresh);
  return result.access;
}

function formatApiError(error: Record<string, unknown>): string {
  const detail = error.detail ?? error.message ?? error.error;
  if (typeof detail === "string") return detail;

  const entries = Object.entries(error)
    .map(([field, value]) => {
      const message = Array.isArray(value) ? value.join("، ") : String(value);
      return `${field}: ${message}`;
    })
    .filter(Boolean);

  return entries.length ? entries.join(" | ") : "درخواست ناموفق بود.";
}

async function djangoFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const access = getCookie(ACCESS_COOKIE);
  if (access) {
    headers.set("Authorization", `Bearer ${access}`);
  }

  const response = await fetch(`${API_BASE_URL()}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return djangoFetch<T>(path, options, false);
    }
    clearAuthCookies();
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(formatApiError(error));
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const getProducts = createServerFn({ method: "GET" })
  .validator((data: ProductFilters = {}) => data)
  .handler(async ({ data }) => {
    // MOCK DATA — comment/remove this block when using Django.
    // if (USE_MOCK()) {
    //   let products = [...mockProducts];
    //   if (data.category) {
    //     products = products.filter(
    //       (product) => product.category?.slug === data.category,
    //     );
    //   }
    //   if (data.search) {
    //     const query = data.search.toLowerCase();
    //     products = products.filter(
    //       (product) =>
    //         product.name.toLowerCase().includes(query) ||
    //         product.description.toLowerCase().includes(query) ||
    //         (product.brand ?? "").toLowerCase().includes(query),
    //     );
    //   }
    //   if (data.brand?.length) {
    //     products = products.filter(
    //       (product) =>
    //         !!product.brand && data.brand!.includes(product.brand),
    //     );
    //   }
    //   if (data.color?.length) {
    //     products = products.filter((product) =>
    //       (product.colors ?? []).some((color) =>
    //         data.color!.includes(color),
    //       ),
    //     );
    //   }
    //   if (typeof data.min_price === "number") {
    //     products = products.filter(
    //       (product) => product.price >= data.min_price!,
    //     );
    //   }
    //   if (typeof data.max_price === "number") {
    //     products = products.filter(
    //       (product) => product.price <= data.max_price!,
    //     );
    //   }
    //   if (data.in_stock) {
    //     products = products.filter(
    //       (product) => product.stock > 0 && product.is_available,
    //     );
    //   }
    //   if (data.ordering === "price") {
    //     products.sort((a, b) => a.price - b.price);
    //   }
    //   if (data.ordering === "-price") {
    //     products.sort((a, b) => b.price - a.price);
    //   }
    //   return products;
    // }

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, String(item)));
      } else if (value !== undefined) {
        params.set(key, String(value));
      }
    }
    return djangoFetch<Product[]>(`/products/?${params.toString()}`);
  });

export const getProductFilterOptions = createServerFn({ method: "GET" })
  .validator((data: { category?: string } = {}) => data)
  .handler(async ({ data }): Promise<ProductFilterOptions> => {
    // MOCK DATA — comment/remove this block when using Django.
    // if (USE_MOCK()) {
    //   const products = data.category
    //     ? mockProducts.filter(
    //         (product) => product.category?.slug === data.category,
    //       )
    //     : mockProducts;
    //   return {
    //     brands: [
    //       ...new Set(
    //         products.map((product) => product.brand).filter(Boolean) as string[],
    //       ),
    //     ],
    //     colors: [
    //       ...new Set(products.flatMap((product) => product.colors ?? [])),
    //     ],
    //     max_price: Math.max(0, ...products.map((product) => product.price)),
    //   };
    // }

    return djangoFetch<ProductFilterOptions>(
      `/products/filters/${
        data.category
          ? `?category=${encodeURIComponent(data.category)}`
          : ""
      }`,
    );
  });

export const getProduct = createServerFn({ method: "GET" })
  .validator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    // MOCK DATA — comment/remove this block when using Django.
    // if (USE_MOCK()) {
    //   const product = mockProducts.find(
    //     (item) => item.slug === data.slug,
    //   );
    //   if (!product) throw new Error("Product not found");
    //   return product;
    // }
    return djangoFetch<Product>(
      `/products/${encodeURIComponent(data.slug)}/`,
    );
  });

export const getCategories = createServerFn({ method: "GET" }).handler(
  async () => {
    // MOCK DATA — comment/remove this block when using Django.
    return USE_MOCK()
      ? mockCategories
      : djangoFetch<Category[]>("/categories/");
  },
);

export const login = createServerFn({ method: "POST" })
  .validator((data: LoginCredentials) => data)
  .handler(async ({ data }) => {
    // MOCK DATA — comment/remove this block when using Django.
    // if (USE_MOCK()) {
    //   const user: User = {
    //     id: 1,
    //     username: data.username,
    //     email: `${data.username}@example.com`,
    //     first_name: "Demo",
    //     last_name: "User",
    //   };
    //   setAuthCookies("mock_access", "mock_refresh");
    //   return {
    //     user,
    //     token: "mock_access",
    //     access: "mock_access",
    //     refresh: "mock_refresh",
    //   };
    // }

    const response = await fetch(`${API_BASE_URL()}/auth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("نام کاربری یا رمز عبور نادرست است.");
    }

    const tokens = (await response.json()) as {
      access: string;
      refresh: string;
    };
    setAuthCookies(tokens.access, tokens.refresh);

    // The cookie is written to the response, so it is not guaranteed to be
    // visible to getCookie() again during this same server function call.
    // Send the access token explicitly for the immediate /me request.
    const userResponse = await fetch(`${API_BASE_URL()}/auth/me/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokens.access}`,
      },
    });

    if (!userResponse.ok) {
      const error = (await userResponse.json().catch(() => ({}))) as Record<string, unknown>;
      throw new Error(formatApiError(error));
    }

    const user = (await userResponse.json()) as User;

    return {
      ...tokens,
      user,
    };
  });

export const register = createServerFn({ method: "POST" })
  .validator((data: RegisterCredentials) => data)
  .handler(async ({ data }) => {
    // MOCK DATA — comment/remove this block when using Django.
    // if (USE_MOCK()) {
    //   const user: User = {
    //     id: 1,
    //     username: data.username,
    //     email: data.email,
    //     first_name: data.first_name,
    //     last_name: data.last_name,
    //   };
    //   setAuthCookies("mock_access", "mock_refresh");
    //   return {
    //     user,
    //     token: "mock_access",
    //     access: "mock_access",
    //     refresh: "mock_refresh",
    //   };
    // }

    const result = await djangoFetch<{
      access?: string;
      refresh?: string;
      token?: string;
      user?: User;
    }>("/auth/register/", {
      method: "POST",
      body: JSON.stringify(data),
    }, false);

    const access = result.access ?? result.token;
    if (!access) throw new Error("ثبت‌نام توکن برنگرداند.");
    setAuthCookies(access, result.refresh);

    return {
      ...result,
      access,
      user: result.user ?? (await djangoFetch<User>("/auth/me/")),
    };
  });

export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async () => {
    // MOCK DATA — comment/remove this block when using Django.
    // if (USE_MOCK()) {
    //   return getCookie(ACCESS_COOKIE) || getCookie(REFRESH_COOKIE)
    //     ? ({
    //         id: 1,
    //         username: "demo",
    //         email: "demo@example.com",
    //         first_name: "Demo",
    //         last_name: "User",
    //       } as User)
    //     : null;
    // }

    if (!getCookie(ACCESS_COOKIE) && !getCookie(REFRESH_COOKIE)) {
      return null;
    }

    try {
      return await djangoFetch<User>("/auth/me/");
    } catch {
      clearAuthCookies();
      return null;
    }
  },
);

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  clearAuthCookies();
  return { success: true };
});

export const getOrders = createServerFn({ method: "GET" }).handler(async () => {
  // MOCK DATA — comment/remove this block when using Django.
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
  .validator(
    (data: {
      items: { product_id: number; quantity: number }[];
      shipping_address: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    // MOCK DATA — comment/remove this block when using Django.
    if (USE_MOCK()) {
      return {
        id: Date.now(),
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

export const getArticles = createServerFn({ method: "GET" })
  .validator((data: { category?: string; search?: string } = {}) => data)
  .handler(async ({ data }) => {
    // MOCK DATA — comment/remove this block when using Django.
    // if (USE_MOCK()) {
    //   let articles = mockArticles.filter((article) => article.is_published);
    //   if (data.search) {
    //     const query = data.search.toLowerCase();
    //     articles = articles.filter(
    //       (article) =>
    //         article.title.toLowerCase().includes(query) ||
    //         article.short_description.toLowerCase().includes(query),
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
    // MOCK DATA — comment/remove this block when using Django.
    // if (USE_MOCK()) {
    //   const article = mockArticles.find((item) => item.slug === data.slug);
    //   if (!article) throw new Error("Article not found");
    //   return article;
    // }
    return djangoFetch<Article>(
      `/articles/${encodeURIComponent(data.slug)}/`,
    );
  });

export const getArticleComments = createServerFn({ method: "GET" })
  .validator((data: { articleId: number }) => data)
  .handler(async ({ data }) => {
    // MOCK DATA — comment/remove this block when using Django.
    if (USE_MOCK()) {
      return mockArticleComments.filter(
        (comment) =>
          comment.article === data.articleId && comment.is_approved,
      );
    }
    return djangoFetch<ArticleComment[]>(
      `/articles/${data.articleId}/comments/`,
    );
  });

export const createArticleComment = createServerFn({ method: "POST" })
  .validator(
    (data: { article: number; text: string; parent?: number | null }) => data,
  )
  .handler(async ({ data }) => {
    // MOCK DATA — comment/remove this block when using Django.
    if (USE_MOCK()) {
      return {
        id: Date.now(),
        ...data,
        user: "شما",
        create_date: new Date().toISOString(),
        is_approved: true,
      } as ArticleComment;
    }
    return djangoFetch<ArticleComment>(
      `/articles/${data.article}/comments/`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  });

export const getProductComments = createServerFn({ method: "GET" })
  .validator((data: { productId: number }) => data)
  .handler(async ({ data }) => {
    // MOCK DATA — comment/remove this block when using Django.
    if (USE_MOCK()) {
      return mockProductComments.filter(
        (comment) =>
          comment.product === data.productId && comment.is_approved,
      );
    }
    return djangoFetch<ProductComment[]>(
      `/products/${data.productId}/comments/`,
    );
  });

export const createProductComment = createServerFn({ method: "POST" })
  .validator(
    (data: {
      product: number;
      text: string;
      rate: number;
      parent?: number | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    // MOCK DATA — comment/remove this block when using Django.
    if (USE_MOCK()) {
      return {
        id: Date.now(),
        ...data,
        user: "شما",
        create_date: new Date().toISOString(),
        is_approved: true,
      } as ProductComment;
    }
    return djangoFetch<ProductComment>(
      `/products/${data.product}/comments/`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  });

export const getSiteSetting = createServerFn({ method: "GET" }).handler(
  async () => {
    // MOCK DATA — comment/remove this block when using Django.
//    return USE_MOCK()
//      ? mockSiteSetting
//      : 
	    return djangoFetch<SiteSetting>("/about/");
  },
);

export const getSiteSettings = getSiteSetting;



// export const submitContactUs = createServerFn({ method: "POST" })
//   .validator((data: { name: string; email: string; message: string }) => data)
//   .handler(async ({ data }) => {
//     return djangoFetch<{ detail: string }>("/about/contact-us/", {
//       method: "POST",
//       body: JSON.stringify(data),
//     });
//   });