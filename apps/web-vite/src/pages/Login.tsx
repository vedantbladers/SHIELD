import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Shield } from "lucide-react";

export default function Login() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [isUnverified, setIsUnverified] = useState(false);

  const handleResend = async () => {
    setResending(true);
    setResendStatus(null);
    try {
      await api.post("/api/cmp/auth/resend-verification", { email });
      setResendStatus("Verification email resent. Check your inbox.");
    } catch (err: any) {
      setResendStatus(err || "Failed to resend email.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResendStatus(null);

    try {
      const result: any = await api.post("/api/cmp/auth/login", { email, password });

      setIsUnverified(false);

      const { role, onboarding_complete } = result.data;

      // Use window.location for full reload so cookie is read
      if (!onboarding_complete) {
        window.location.href = "/onboard";
      } else {
        window.location.href = redirectTo || `/dashboard/${role}`;
      }
    } catch (err: any) {
      const errorMessage = typeof err === "string" ? err : "Login failed";
      setError(errorMessage);
      if (errorMessage.toLowerCase().includes("verify your email")) {
        setIsUnverified(true);
      } else {
        setIsUnverified(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo block above card */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SHIELD</h1>
          <p className="text-slate-400 text-sm mt-1">
            Anonymous Cybersecurity Marketplace
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Welcome Back</h2>
          <p className="text-slate-500 text-sm mb-6">Sign in to your anonymous SHIELD account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-red-50 text-red-700 text-sm font-medium border border-red-200">
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  <span>{error}</span>
                </div>
                {isUnverified && (
                  <div className="mt-1 border-t border-red-200/50 pt-2 flex flex-col gap-1 text-left">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      className="text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50 inline-block w-fit"
                    >
                      {resending ? "Resending..." : "Resend verification email"}
                    </button>
                    {resendStatus && (
                      <p className="mt-1 text-xs text-emerald-600 font-semibold">
                        {resendStatus}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign In Securely"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="text-indigo-600 font-semibold hover:underline">
                Create Anonymous Account
              </Link>
            </p>
          </div>
        </div>

        {/* Footer links */}
        <p className="text-center text-slate-400 text-sm mt-6">
          Your identity is protected by 256-bit encryption · Zero-knowledge architecture
        </p>
      </div>
    </div>
  );
}
