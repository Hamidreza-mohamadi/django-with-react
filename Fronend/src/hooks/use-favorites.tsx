import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { addFavorite, getFavorites, removeFavorite } from "@/lib/shop/api";
import type { Product } from "@/lib/shop/types";

interface FavoritesContextValue {
  favorites: Product[];
  isFavorite: (productId: number) => boolean;
  toggleFavorite: (product: Product) => void;
  removeFavorite: (productId: number) => void;
  favoriteCount: number;
  isLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);
const favoritesKey = ["favorites"];

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const favoritesQuery = useQuery({
    queryKey: favoritesKey,
    queryFn: () => getFavorites(),
    enabled: isAuthenticated,
    staleTime: 30_000,
    retry: false,
  });

  const addMutation = useMutation({
    mutationFn: (product: Product) => addFavorite({ data: { productId: product.id } }),
    onMutate: async (product) => {
      await queryClient.cancelQueries({ queryKey: favoritesKey });
      const previous = queryClient.getQueryData<Product[]>(favoritesKey) ?? [];
      queryClient.setQueryData<Product[]>(favoritesKey, [
        ...previous.filter((item) => item.id !== product.id),
        product,
      ]);
      return { previous };
    },
    onError: (_error, _product, context) => {
      if (context?.previous) queryClient.setQueryData(favoritesKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: favoritesKey }),
  });

  const removeMutation = useMutation({
    mutationFn: (productId: number) => removeFavorite({ data: { productId } }),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: favoritesKey });
      const previous = queryClient.getQueryData<Product[]>(favoritesKey) ?? [];
      queryClient.setQueryData<Product[]>(favoritesKey, previous.filter((item) => item.id !== productId));
      return { previous };
    },
    onError: (_error, _productId, context) => {
      if (context?.previous) queryClient.setQueryData(favoritesKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: favoritesKey }),
  });

  const favorites = isAuthenticated ? (favoritesQuery.data ?? []) : [];
  const isFavorite = (productId: number) => favorites.some((product) => product.id === productId);
  const remove = (productId: number) => removeMutation.mutate(productId);
  const toggleFavorite = (product: Product) => {
    if (isFavorite(product.id)) remove(product.id);
    else addMutation.mutate(product);
  };

  return (
    <FavoritesContext.Provider value={{
      favorites,
      isFavorite,
      toggleFavorite,
      removeFavorite: remove,
      favoriteCount: favorites.length,
      isLoading: isAuthenticated && favoritesQuery.isLoading,
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites must be used within a FavoritesProvider");
  return context;
}
