import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardRedirect() {
  const navigate = useNavigate();
  const { role, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    const path =
      role === "moderator"
        ? "/dashboard/moderator"
        : role === "vendor"
        ? "/dashboard/vendor"
        : "/dashboard/buyer";
    navigate(path, { replace: true });
  }, [role, isLoading, isAuthenticated, navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
        <p className="text-sm text-slate-500">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
