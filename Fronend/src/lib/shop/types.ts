export interface Category {
  id: number;
  name: string;
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
  | "-created_at"
  | "-sales_count"
  | "-views"
  | "-price"
  | "price";

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
  price: number;
}

export interface Order {
  id: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  total: number;
  items: OrderItem[];
  created_at: string;
  updated_at?: string;
  shipping_address?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
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
