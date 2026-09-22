import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Product } from "@/lib/shop/types";

interface FavoritesContextValue {
  favorites: Product[];
  isFavorite: (productId: number) => boolean;
  toggleFavorite: (product: Product) => void;
  removeFavorite: (productId: number) => void;
  favoriteCount: number;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const STORAGE_KEY = "shop_favorites";

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setFavorites(JSON.parse(stored));
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites, hydrated]);

  const isFavorite = useCallback(
    (productId: number) => favorites.some((p) => p.id === productId),
    [favorites],
  );

  const toggleFavorite = useCallback((product: Product) => {
    setFavorites((prev) =>
      prev.some((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product],
    );
  }, []);

  const removeFavorite = useCallback((productId: number) => {
    setFavorites((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
        removeFavorite,
        favoriteCount: favorites.length,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites must be used within a FavoritesProvider");
  return context;
}
