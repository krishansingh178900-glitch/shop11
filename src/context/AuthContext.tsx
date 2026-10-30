"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
}

export interface CurrentShop {
  id: string;
  name: string;
  ownerName: string;
  category: string;
  currency: string;
  taxRatePercent: number;
  invoicePrefix: string;
  address?: string | null;
}

interface AuthContextType {
  user: CurrentUser | null;
  shop: CurrentShop | null;
  role: string;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  shop: null,
  role: "OWNER",
  loading: true,
  refreshAuth: async () => {},
  logout: async () => {},
});

const getInitialAuth = () => {
  if (typeof window === "undefined") {
    return { user: null, shop: null, role: "OWNER", hasCached: false };
  }
  try {
    const rawUser = localStorage.getItem("sra_cached_user");
    const rawShop = localStorage.getItem("sra_cached_shop");
    const rawRole = localStorage.getItem("sra_cached_role");
    if (rawUser && rawShop) {
      return {
        user: JSON.parse(rawUser),
        shop: JSON.parse(rawShop),
        role: rawRole || "OWNER",
        hasCached: true,
      };
    }
  } catch {}
  return { user: null, shop: null, role: "OWNER", hasCached: false };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initial = getInitialAuth();
  const [user, setUser] = useState<CurrentUser | null>(initial.user);
  const [shop, setShop] = useState<CurrentShop | null>(initial.shop);
  const [role, setRole] = useState<string>(initial.role);
  const [loading, setLoading] = useState(!initial.hasCached);
  const router = useRouter();

  const refreshAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setShop(data.shop);
        setRole(data.role || "OWNER");
        try {
          localStorage.setItem("sra_cached_user", JSON.stringify(data.user));
          localStorage.setItem("sra_cached_shop", JSON.stringify(data.shop));
          localStorage.setItem("sra_cached_role", data.role || "OWNER");
        } catch {}
      } else {
        setUser(null);
        setShop(null);
        try {
          localStorage.removeItem("sra_cached_user");
          localStorage.removeItem("sra_cached_shop");
          localStorage.removeItem("sra_cached_role");
        } catch {}
      }
    } catch {
      setUser(null);
      setShop(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const logout = async () => {
    try {
      localStorage.removeItem("sra_cached_user");
      localStorage.removeItem("sra_cached_shop");
      localStorage.removeItem("sra_cached_role");
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setShop(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, shop, role, loading, refreshAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
