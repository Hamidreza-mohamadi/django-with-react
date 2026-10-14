export interface Category {
  id: number;
  name: string;
  title?: string;
  slug: string;
  is_active: boolean;
  image?: string;
  parent?: Category;
  description?: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  compare_price?: number;
  discount?: number;
  admin?: string;
  description: string;
  category?: Category;
  category_id?: number;
  brand?: string;
  image?: string;
  images?: string[];
  stock: number;
  slug: string;
  is_available: boolean;
  created_at?: string;
  rating?: number;
  colors?: string[];
  sales_count?: number;
  views?: number;
  reviews_count?: number;
  specs?: { label: string; value: string }[];
  updated_at?: string;
}

export type ProductOrdering =
  | "-created_date"
  | "-sales_count"
  | "-views"
  | "-current_price"
  | "current_price";

export interface ProductFilters {
  category?: string;
  search?: string;
  page?: number;
  brand?: string[];
  color?: string[];
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  ordering?: ProductOrdering;
}

export interface ProductPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

export interface ProductFilterOptions {
  brands: string[];
  colors: string[];
  max_price: number;
}

export interface CartItem {
  id: number;
  product: Product;
  quantity: number;
}

export interface Cart {
  id?: number;
  items: CartItem[];
  total: number;
  item_count: number;
}

export interface OrderItem {
  id: number;
  product: Product;
  quantity: number;
  unit_price?: number;
  line_total?: number;
  price: number;
}

export interface OrderQuote {
  items: { product_id: number; name: string; quantity: number; regular_unit_price: number; unit_price: number; line_discount: number; line_total: number }[];
  original_subtotal: number;
  discount_total: number;
  subtotal: number;
  shipping_cost: number;
  total: number;
  currency: string;
}

export interface Order {
  id: number;
  status?: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  is_paid?: boolean;
  pay_date?: string | null;
  total: number;
  items: OrderItem[];
  created_at?: string;
  updated_at?: string;
  expires_at?: string | null;
  shipping_cost?: number;
  address?: {
    province?: string;
    city: string;
    postal_code: string;
    exact_address: string;
    phone: string;
  } | null;
  shipping_address?: {
    province?: string;
    city: string;
    postal_code: string;
    exact_address: string;
    phone: string;
  } | string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar?: string | null;
  about_user?: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}

export interface Article {
  id: number;
  title: string;
  author: string;
  content: string;
  short_description: string;
  pub_date: string;
  category: Category | string;
  image?: string;
  is_published: boolean;
  slug: string;
}

export interface ArticleComment {
  id: number;
  article: number;
  user: string;
  text: string;
  create_date: string;
  is_approved: boolean;
  parent?: number | null;
  replies?: ArticleComment[];
}

export interface ProductComment {
  id: number;
  product: number;
  user: string;
  text: string;
  create_date: string;
  is_approved: boolean;
  parent?: number | null;
  rate: number;
  replies?: ProductComment[];
}

export interface SiteSetting {
  site_name: string;
  site_url: string;
  address?: string;
  phone: string;
  fax?: string;
  email: string;
  copy_right: string;
  about_us_text: string;
  site_logo?: string;
  picture?: string;
  is_main_setting: boolean;
}


export interface PublicUser {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar?: string | null;
  about_user?: string | null;
}
