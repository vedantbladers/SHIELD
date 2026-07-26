import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirect to login, saving original location for post-auth redirect
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 1. Onboarding check
  const isOnboarded = profile?.onboarding_complete ?? false;
  const userRole = profile?.role || "buyer";

  if (!isOnboarded && location.pathname !== "/onboard") {
    return <Navigate to="/onboard" replace />;
  }

  if (isOnboarded && location.pathname === "/onboard") {
    // Redirect onboarded user to dashboard
    return <Navigate to={`/dashboard/${userRole}`} replace />;
  }

  // 2. Role authorization check
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Redirect to user's correct dashboard based on role
    return <Navigate to={`/dashboard/${userRole}`} replace />;
  }

  return <>{children}</>;
};
