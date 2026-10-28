import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { api } from "./api";

/** Just authentication (+ role, since that's the one thing routing needs to
 *  decide whether to show an Admin link) — there's no account-type branch
 *  to track here anymore (one flow, not two). Where a user is within that
 *  flow (choose a bot / pay / link / complete) is read from
 *  `GET /account/profile`'s `flow` field directly by whichever page needs
 *  it (mainly `OnboardingLayout`), not duplicated into this context. */
interface AuthState {
  loading: boolean;
  authenticated: boolean;
  userId: string | null;
  role: "user" | "admin" | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<"user" | "admin" | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const session = await api.get<{ authenticated: boolean; userId?: string; role?: "user" | "admin" }>("/auth/session");
      setAuthenticated(session.authenticated);
      setUserId(session.userId ?? null);
      setRole(session.role ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setAuthenticated(false);
    setUserId(null);
    setRole(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <AuthContext.Provider value={{ loading, authenticated, userId, role, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
