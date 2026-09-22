"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, getToken, setToken } from "./api";

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role: "USER" | "ADMIN";
}

interface AuthCtx {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: {
    email: string; password: string; name?: string;
    charityId?: string; charityPercentage?: number;
  }) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (getToken()) {
          const me = await api<SessionUser>("/users/me");
          setUser({ id: me.id, email: me.email, name: me.name, role: me.role });
        }
      } catch {
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api<{ token: string; user: SessionUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      auth: false,
    });
    setToken(res.token);
    setUser(res.user);
  };

  const signup = async (payload: Parameters<AuthCtx["signup"]>[0]) => {
    const res = await api<{ token: string; user: SessionUser }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
      auth: false,
    });
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    window.location.href = "/";
  };

  return <Ctx.Provider value={{ user, loading, login, signup, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
