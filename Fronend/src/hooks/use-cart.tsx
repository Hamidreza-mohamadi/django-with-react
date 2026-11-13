import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Product, ProductVariant } from "@/lib/shop/types";
import { useAuth } from "@/hooks/use-auth";

export interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeItem: (variantId: number) => void;
  updateQuantity: (variantId: number, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function cartStorageKey(userId: number | undefined) {
  return userId ? `shop_cart:user:${userId}` : "shop_cart:guest";
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const storageKey = cartStorageKey(user?.id);
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    setHydratedKey(null);
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      // Old carts did not identify a SKU. Drop those entries rather than silently
      // purchasing an arbitrary variant after this schema change.
      const validItems = Array.isArray(parsed)
        ? (parsed as CartItem[]).filter((item) =>
            item && item.product && item.variant && Number.isInteger(item.variant.id),
          )
        : [];
      setItems(validItems);
    } catch {
      setItems([]);
    }
    setHydratedKey(storageKey);
  }, [authLoading, storageKey]);

  useEffect(() => {
    if (hydratedKey === storageKey && !authLoading) {
      localStorage.setItem(storageKey, JSON.stringify(items));
    }
  }, [items, hydratedKey, authLoading, storageKey]);

  const addItem = useCallback((product: Product, variant: ProductVariant, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.variant.id === variant.id);
      if (existing) {
        return prev.map((item) =>
          item.variant.id === variant.id
            ? { ...item, product, variant, quantity: Math.min(variant.stock, item.quantity + quantity) }
            : item,
        );
      }
      return [...prev, { product, variant, quantity: Math.min(variant.stock, quantity) }];
    });
  }, []);

  const removeItem = useCallback((variantId: number) => {
    setItems((prev) => prev.filter((item) => item.variant.id !== variantId));
  }, []);

  const updateQuantity = useCallback((variantId: number, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.variant.id !== variantId));
      return;
    }
    setItems((prev) =>
      prev.map((item) => item.variant.id === variantId
        ? { ...item, quantity: Math.min(item.variant.stock, quantity) }
        : item),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const total = items.reduce((sum, item) => sum + item.variant.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
