import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentUser, login as loginFn, logout as logoutFn, register as registerFn } from "@/lib/shop/api";
import type { LoginCredentials, RegisterCredentials, User } from "@/lib/shop/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const fetchUser = useServerFn(getCurrentUser);
  const doLogin = useServerFn(loginFn);
  const doLogout = useServerFn(logoutFn);
  const doRegister = useServerFn(registerFn);

  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000,
  });

  const login = async (credentials: LoginCredentials) => {
    await doLogin({ data: credentials });
    await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
  };

  const register = async (credentials: RegisterCredentials) => {
    await doRegister({ data: credentials });
    await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
  };

  const logout = async () => {
    await doLogout();
    queryClient.setQueryData(["auth", "me"], null);
    await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
