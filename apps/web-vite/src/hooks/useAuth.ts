import { useAuth as useAuthContext } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export function useAuth() {
  const ctx = useAuthContext();
  const navigate = useNavigate();

  const signOut = async () => {
    try {
      await ctx.logout();
    } finally {
      navigate("/login");
    }
  };

  const requireAuth = () => {
    if (!ctx.isLoading && !ctx.isAuthenticated) {
      navigate(`/login?redirect=${window.location.pathname}`);
    }
  };

  return {
    user: ctx.user,
    profile: ctx.profile,
    alias: ctx.alias,
    role: ctx.role,
    isLoading: ctx.isLoading,
    isAuthenticated: ctx.isAuthenticated,
    signOut,
    requireAuth,
    refreshSession: ctx.refresh,
  };
}
