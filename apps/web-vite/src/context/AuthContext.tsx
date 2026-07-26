import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/lib/api";

interface UserSession {
  id: string;
  email: string;
}

interface UserProfile {
  id: string;
  alias: string;
  role: string;
  trust_score: number;
  onboarding_complete: boolean;
  rating_as_vendor: number;
  rating_as_buyer: number;
  total_vendor_reviews: number;
  total_buyer_reviews: number;
  created_at: string | null;
  updated_at: string | null;
}

interface AuthContextType {
  user: UserSession | null;
  profile: UserProfile | null;
  role: string | null;
  alias: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const resp = await api.get("/api/auth/me");
      if (resp && resp.data) {
        setUser(resp.data.user || null);
        setProfile(resp.data.profile || null);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const resp = await api.post("/api/auth/login", { email, password });
      await fetchUser();
      return resp.data;
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post("/api/auth/logout");
    } finally {
      setUser(null);
      setProfile(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role || null,
        alias: profile?.alias || null,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refresh: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
