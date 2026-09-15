import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { api } from "./api";

export interface OnboardingStatus {
  completedSteps: string[];
  nextStep: string;
  progressFraction: number;
  steps: { step: string; description: string; completed: boolean }[];
}

interface AuthState {
  loading: boolean;
  authenticated: boolean;
  userId: string | null;
  onboarding: OnboardingStatus | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const session = await api.get<{ authenticated: boolean; userId?: string }>("/auth/session");
      setAuthenticated(session.authenticated);
      setUserId(session.userId ?? null);
      if (session.authenticated) {
        const status = await api.get<OnboardingStatus>("/onboarding/status");
        setOnboarding(status);
      } else {
        setOnboarding(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setAuthenticated(false);
    setUserId(null);
    setOnboarding(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ loading, authenticated, userId, onboarding, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
