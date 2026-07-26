// ============================================================
// SIGNUP PAGE — Combined Role selection, alias, registration & AuthLayout
// Uses /api/cmp/auth/signup and /api/cmp/alias/check via the axios api client
// ============================================================

import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Shield } from "lucide-react";

type UserRole = "buyer" | "vendor";
type AliasStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "forbidden";

const FORBIDDEN_WORDS = [
  'admin', 'system', 'shield', 'support', 'help', 'mod', 'moderator',
  'root', 'test', 'demo', 'guest', 'anon', 'null', 'undefined', 'staff',
];

const CUSTOM_PART_REGEX = /^[a-zA-Z0-9]{3,16}$/;

export default function Signup() {
  const [searchParams] = useSearchParams();

  // Pre-select role if specified in search query params
  const roleParam = searchParams.get("role");
  const initialRole = (roleParam === "buyer" || roleParam === "vendor") ? roleParam : "";

  const [selectedRole, setSelectedRole] = useState<UserRole | "">(initialRole);
  const [aliasCustomPart, setAliasCustomPart] = useState("");
  const [aliasStatus, setAliasStatus] = useState<AliasStatus>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successAlias, setSuccessAlias] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    setResendStatus(null);
    try {
      await api.post("/api/cmp/auth/resend-verification", { email });
      setResendStatus("Verification email resent. Check your inbox.");
    } catch (err: any) {
      setResendStatus(typeof err === "string" ? err : err?.message || "Failed to resend email.");
    } finally {
      setResending(false);
    }
  };

  // Computed
  const rolePrefix = selectedRole === "vendor" ? "Vendor" : selectedRole === "buyer" ? "Buyer" : "";
  const fullAlias = rolePrefix && aliasCustomPart ? `${rolePrefix}-${aliasCustomPart}` : "";

  // Debounced alias availability check
  useEffect(() => {
    if (!aliasCustomPart || !selectedRole) {
      setAliasStatus("idle");
      return;
    }

    // Client-side validation first (no API call needed)
    if (!CUSTOM_PART_REGEX.test(aliasCustomPart)) {
      setAliasStatus("invalid");
      return;
    }

    // Client-side forbidden check
    if (FORBIDDEN_WORDS.includes(aliasCustomPart.toLowerCase())) {
      setAliasStatus("forbidden");
      return;
    }

    setAliasStatus("checking");

    // Debounce: wait 500ms after last keystroke
    const timer = setTimeout(async () => {
      const prefix = selectedRole === "vendor" ? "Vendor" : "Buyer";
      const checkAlias = `${prefix}-${aliasCustomPart}`;
      try {
        const res = await api.get<any>(
          `/api/cmp/alias/check?alias=${encodeURIComponent(checkAlias)}`
        );
        const { available, reason } = res.data;
        if (reason === "forbidden") {
          setAliasStatus("forbidden");
        } else if (available) {
          setAliasStatus("available");
        } else {
          setAliasStatus("taken");
        }
      } catch {
        setAliasStatus("idle");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [aliasCustomPart, selectedRole]);

  const isFormValid =
    selectedRole &&
    aliasStatus === "available" &&
    email &&
    password.length >= 8 &&
    password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const prefix = selectedRole === "vendor" ? "Vendor" : "Buyer";
      const alias = `${prefix}-${aliasCustomPart}`;

      await api.post("/api/cmp/auth/signup", {
        email,
        password,
        alias,
        role: selectedRole,
      });

      setSuccessAlias(alias);
    } catch (err: any) {
      setError(typeof err === "string" ? err : err?.message || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Alias status indicator component
  const renderAliasStatus = () => {
    switch (aliasStatus) {
      case "checking":
        return (
          <span className="text-slate-400 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Checking...
          </span>
        );
      case "available":
        return (
          <span className="text-emerald-600 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {fullAlias} is available
          </span>
        );
      case "taken":
        return (
          <span className="text-red-600 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Already taken — try another
          </span>
        );
      case "invalid":
        return (
          <span className="text-amber-600 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            Letters and numbers only, 3-16 characters
          </span>
        );
      case "forbidden":
        return (
          <span className="text-red-600 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            That word is not allowed
          </span>
        );
      default:
        return null;
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

        {successAlias ? (
          /* ── Success card ──────────────────────────── */
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center slide-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 mb-6 border border-indigo-100">
              <Shield className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Check your email!
            </h2>
            <p className="text-slate-500 text-sm mb-4 max-w-sm mx-auto leading-relaxed">
              We sent a verification link to <span className="font-semibold text-slate-800">{email}</span>.<br />
              Click the link in the email to activate your account.
            </p>
            <p className="text-xs text-slate-400 mb-2">
              The link expires in 24 hours.
            </p>
            <p className="text-xs text-slate-400/80 mb-6 italic">
              Did not receive it? Check your spam folder.
            </p>

            {resendStatus && (
              <div className="mb-4 text-xs font-medium text-indigo-600">
                {resendStatus}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-sm font-semibold text-indigo-600 hover:underline disabled:opacity-50"
              >
                {resending ? "Resending..." : "Resend verification email"}
              </button>
              
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-md mt-2"
              >
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          /* ── Signup form ──────────────────────────── */
          <div className="bg-white rounded-3xl shadow-2xl p-8 slide-up">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Create Anonymous Account</h2>
            <p className="text-slate-500 text-sm mb-6">Your identity stays hidden. Only your alias is visible.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 text-red-700 text-sm font-medium border border-red-200">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* ── Field 1: Role Selection ── */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("buyer")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedRole === "buyer"
                        ? "border-indigo-500 bg-indigo-50/50"
                        : "border-slate-200 hover:border-indigo-400 text-left transition-all bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className={`w-4.5 h-4.5 ${selectedRole === "buyer" ? "text-indigo-600" : "text-slate-400"}`} />
                      <span className="font-semibold text-sm text-slate-800">Buyer</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">I need cybersecurity services</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("vendor")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedRole === "vendor"
                        ? "border-indigo-500 bg-indigo-50/50"
                        : "border-slate-200 hover:border-indigo-400 text-left transition-all bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className={`w-4.5 h-4.5 ${selectedRole === "vendor" ? "text-indigo-600" : "text-slate-400"}`} />
                      <span className="font-semibold text-sm text-slate-800">Vendor</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">I provide security services</p>
                  </button>
                </div>
              </div>

              {/* ── Field 2: Alias (Codename) ── */}
              {selectedRole && (
                <div>
                  <label htmlFor="signup-alias" className="block text-sm font-medium text-slate-700 mb-1">
                    Choose your codename
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    This is your anonymous identity on SHIELD. It cannot be changed after signup.
                  </p>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-sm font-semibold text-indigo-600 select-none pointer-events-none">
                      {rolePrefix}-
                    </span>
                    <input
                      id="signup-alias"
                      type="text"
                      value={aliasCustomPart}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                        setAliasCustomPart(val.slice(0, 16));
                      }}
                      placeholder="e.g. Shadow, Phantom, Cipher"
                      maxLength={16}
                      className="w-full pl-[80px] pr-10 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-mono transition-all"
                    />
                    {/* Status icon inside input */}
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      {aliasStatus === "available" && (
                        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      )}
                      {(aliasStatus === "taken" || aliasStatus === "forbidden") && (
                        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      )}
                      {aliasStatus === "invalid" && (
                        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                      )}
                      {aliasStatus === "checking" && (
                        <svg className="w-5 h-5 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                    </span>
                  </div>

                  {/* Status message below input */}
                  <div className="mt-1.5 text-xs min-h-[1.25rem]">
                    {renderAliasStatus()}
                  </div>

                  {/* Live preview */}
                  {fullAlias && aliasStatus === "available" && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <span className="text-slate-500">Your identity will be: </span>
                      <span className="font-mono font-semibold text-slate-800">{fullAlias}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Field 3: Email ── */}
              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
                />
                <p className="mt-1 text-[11px] text-slate-400">Email is used only for login — never shown to other users</p>
              </div>

              {/* ── Field 4: Password ── */}
              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
                />
              </div>

              {/* ── Field 5: Confirm Password ── */}
              <div>
                <label htmlFor="signup-confirm" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm password
                </label>
                <input
                  id="signup-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  "Create my account"
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                Already have an account?{" "}
                <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <p className="text-center text-slate-400 text-sm mt-6">
          Your identity is protected by 256-bit encryption · Zero-knowledge architecture
        </p>
      </div>
    </div>
  );
}
