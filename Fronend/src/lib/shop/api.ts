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
  OrderQuote,
  Product,
  ProductComment,
  ProductFilterOptions,
  ProductFilters,
  ProductPage,
  PublicUser,
  RegisterCredentials,
  SiteSetting,
  User,
} from "./types";
import {
  mockArticles,
  mockArticleComments,
  mockProductComments,
  mockProducts,
  mockSiteSetting,
} from "./mock";

const API_BASE_URL = () =>
  process.env.DJANGO_API_BASE_URL || "http://localhost:8000/api/v1";
const USE_MOCK = () => !process.env.DJANGO_API_BASE_URL;

const ACCESS_COOKIE = "django_access_token";
const REFRESH_COOKIE = "django_refresh_token";
const VISITOR_COOKIE = "shop_visitor_id";
const ACCESS_MAX_AGE = 60 * 15;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

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

type RefreshedTokens = { access: string; refresh?: string };
type RefreshCacheEntry = {
  expiresAt: number;
  promise: Promise<RefreshedTokens | null>;
};

// Refresh-token rotation can invalidate a token while another SSR request is
// trying to refresh with the same cookie. Reuse the result briefly for requests
// that arrived with that same (now rotated) cookie.
const refreshTokenCache = new Map<string, RefreshCacheEntry>();
const REFRESH_CACHE_TTL_MS = 120_000;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getCookie(REFRESH_COOKIE);
  if (!refresh) return null;

  const now = Date.now();
  for (const [token, entry] of refreshTokenCache) {
    if (entry.expiresAt <= now) refreshTokenCache.delete(token);
  }

  let entry = refreshTokenCache.get(refresh);
  if (!entry) {
    const promise = (async (): Promise<RefreshedTokens | null> => {
      const response = await fetch(`${API_BASE_URL()}/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });

      if (!response.ok) return null;

      const result = (await response.json()) as {
        access?: string;
        refresh?: string;
      };
      if (!result.access) return null;
      return { access: result.access, refresh: result.refresh };
    })();

    // Do not expire an in-flight refresh: otherwise a slow response could
    // allow a second request to rotate the same refresh token concurrently.
    entry = { expiresAt: Number.POSITIVE_INFINITY, promise };
    refreshTokenCache.set(refresh, entry);
    void promise.then(
      () => {
        const currentEntry = refreshTokenCache.get(refresh);
        if (currentEntry?.promise === promise) {
          currentEntry.expiresAt = Date.now() + REFRESH_CACHE_TTL_MS;
        }
      },
      () => {
        if (refreshTokenCache.get(refresh)?.promise === promise) {
          refreshTokenCache.delete(refresh);
        }
      },
    );
    // Keep the process-local cache bounded if many distinct sessions refresh.
    if (refreshTokenCache.size > 500) {
      const oldestKey = refreshTokenCache.keys().next().value;
      if (oldestKey) refreshTokenCache.delete(oldestKey);
    }
  }

  const result = await entry.promise;
  if (!result) {
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
  accessOverride?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  // A refreshed HttpOnly cookie is attached to the response and may not be
  // readable again during this same server-function invocation. Use the token
  // returned by refresh directly for the retry instead of re-reading the cookie.
  const access = accessOverride ?? getCookie(ACCESS_COOKIE);
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
      return djangoFetch<T>(path, options, false, refreshed);
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
        if (value.length) params.set(key, value.map(String).join(","));
      } else if (value !== undefined) {
        params.set(key, String(value));
      }
    }
    return djangoFetch<ProductPage>(`/products/?${params.toString()}`);
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
    let visitorId = getCookie(VISITOR_COOKIE);
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      setCookie(VISITOR_COOKIE, visitorId, cookieOptions(60 * 60 * 24 * 365));
    }
    return djangoFetch<Product>(
      `/products/${encodeURIComponent(data.slug)}/`,
      { headers: { "X-Visitor-ID": visitorId } },
    );
  });

export const getCategories = createServerFn({ method: "GET" }).handler(
  async () => djangoFetch<Category[]>("/products/categories/"),
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
  .handler(async ({ data }) =>
    djangoFetch<{ detail: string }>("/auth/register/", {
      method: "POST",
      body: JSON.stringify(data),
    }, false),
  );

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
    } catch (error) {
      // djangoFetch/refreshAccessToken clears cookies only when the refresh token
      // is rejected. Keep tokens when the API is temporarily unreachable so a
      // transient network failure does not silently sign the user out.
      if (!getCookie(ACCESS_COOKIE) && !getCookie(REFRESH_COOKIE)) {
        return null;
      }
      throw error;
    }
  },
);

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const refresh = getCookie(REFRESH_COOKIE);

  try {
    await fetch(`${API_BASE_URL()}/auth/logout/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(refresh ? { refresh } : {}),
    });
  } finally {
    clearAuthCookies();
  }

  return { success: true };
});

export const getOrders = createServerFn({ method: "GET" }).handler(async () => {
  return djangoFetch<Order[]>("/orders/");
});

export const getOrderQuote = createServerFn({ method: "POST" })
  .validator((data: { items: { variant_id: number; quantity: number }[] }) => data)
  .handler(async ({ data }) =>
    djangoFetch<OrderQuote>("/orders/quote/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  );

export const cancelOrder = createServerFn({ method: "POST" })
  .validator((data: { orderId: number }) => data)
  .handler(async ({ data }) =>
    djangoFetch<Order>(`/orders/${data.orderId}/cancel/`, { method: "POST" }),
  );

export const simulateOrderPayment = createServerFn({ method: "POST" })
  .validator((data: { orderId: number }) => data)
  .handler(async ({ data }) =>
    djangoFetch<Order>(`/orders/${data.orderId}/simulate-payment/`, { method: "POST" }),
  );

export const createOrder = createServerFn({ method: "POST" })
  .validator(
    (data: {
      items: { variant_id: number; quantity: number }[];
      shipping_address: { province?: string; city: string; postal_code: string; exact_address: string; phone: string };
    }) => data,
  )
  .handler(async ({ data }) =>
    djangoFetch<Order>("/orders/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  );

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

export const activateAccount = createServerFn({ method: "GET" })
  .validator((data: { code: string }) => data)
  .handler(async ({ data }) =>
    djangoFetch<{ detail: string }>(`/auth/active-account/${encodeURIComponent(data.code)}/`, {}, false),
  );

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }) =>
    djangoFetch<{ detail: string }>("/auth/forget-pass/", {
      method: "POST",
      body: JSON.stringify(data),
    }, false),
  );

export const resetPassword = createServerFn({ method: "POST" })
  .validator((data: { code: string; new_password: string; confirm_password: string }) => data)
  .handler(async ({ data }) =>
    djangoFetch<{ detail: string }>(`/auth/rewrite-pass/${encodeURIComponent(data.code)}/`, {
      method: "POST",
      body: JSON.stringify({ new_password: data.new_password, confirm_password: data.confirm_password }),
    }, false),
  );

export const changePassword = createServerFn({ method: "POST" })
  .validator((data: { old_password: string; new_password: string; confirm_password: string }) => data)
  .handler(async ({ data }) =>
    djangoFetch<{ detail: string }>("/auth/change-pass/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  );

export const updateProfile = createServerFn({ method: "POST" })
  .validator((data: { username: string; first_name: string; last_name: string; about_user: string; avatarData?: string; avatarName?: string; avatarType?: string }) => data)
  .handler(async ({ data }) => {
    const form = new FormData();
    form.set("username", data.username);
    form.set("first_name", data.first_name);
    form.set("last_name", data.last_name);
    form.set("about_user", data.about_user);
    if (data.avatarData) {
      const bytes = Uint8Array.from(atob(data.avatarData.split(",")[1] ?? ""), (char) => char.charCodeAt(0));
      form.set("avatar", new Blob([bytes], { type: data.avatarType || "application/octet-stream" }), data.avatarName || "avatar");
    }
    const access = getCookie(ACCESS_COOKIE);
    const response = await fetch(`${API_BASE_URL()}/auth/edit-profile/`, {
      method: "PATCH",
      headers: access ? { Authorization: `Bearer ${access}` } : {},
      body: form,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(formatApiError(error));
    }
    return response.json() as Promise<User>;
  });


export const getFavorites = createServerFn({ method: "GET" }).handler(
  async () => djangoFetch<Product[]>("/products/favorites/"),
);

export const addFavorite = createServerFn({ method: "POST" })
  .validator((data: { productId: number }) => data)
  .handler(async ({ data }) =>
    djangoFetch<Product>("/products/favorites/", {
      method: "POST",
      body: JSON.stringify({ product_id: data.productId }),
    }),
  );

export const removeFavorite = createServerFn({ method: "POST" })
  .validator((data: { productId: number }) => data)
  .handler(async ({ data }) =>
    djangoFetch<{}>(`/products/favorites/?product_id=${data.productId}`, {
      method: "DELETE",
    }),
  );


export const getPublicProfile = createServerFn({ method: "GET" })
  .validator((data: { username: string }) => data)
  .handler(async ({ data }) =>
    djangoFetch<PublicUser>(`/auth/users/${encodeURIComponent(data.username)}/`, {}, false),
  );
